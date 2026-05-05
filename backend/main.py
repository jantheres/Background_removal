from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from rembg import remove, new_session
from PIL import Image, ImageOps, ImageEnhance
import io
import traceback
import base64
import zipfile
from typing import List

app = FastAPI(title="Automotive Catalog API")

# Global model session cache
_models = {}

def get_model():
    if "isnet" not in _models:
        print("Loading AI model (isnet-general-use)...")
        _models["isnet"] = new_session("isnet-general-use")
        print("Model loaded successfully.")
    return _models["isnet"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://backgroundremoval-bg-remove.up.railway.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def to_b64(img):
    buff = io.BytesIO()
    img.save(buff, format='PNG', optimize=True)
    return f"data:image/png;base64,{base64.b64encode(buff.getvalue()).decode('utf-8')}"

def process_car_image(input_image):
    # SPEED OPTIMIZATION: Shrink huge 4K images down to max 1024px to save CPU time
    input_image.thumbnail((1024, 1024), Image.LANCZOS)

    # Ensure RGB for background removal
    if input_image.mode != "RGB":
        input_image = input_image.convert("RGB")
        
    # Disabled alpha_matting: Cars have hard edges, so matting is unnecessary and causes math warnings.
    no_bg = remove(input_image, session=get_model(), alpha_matting=False)
    
    bbox = no_bg.getbbox()
    if not bbox:
        return None, None
    
    car = no_bg.crop(bbox)
    
    # Studio Polish
    car = ImageEnhance.Sharpness(car).enhance(1.4)
    car = ImageEnhance.Contrast(car).enhance(1.1)
    car = ImageEnhance.Brightness(car).enhance(1.02)
    
    # Mirroring
    car_flipped = ImageOps.mirror(car)
    
    return car, car_flipped

@app.get("/")
def home():
    return {"message": "Automotive Catalog API is active"}

@app.post("/remove-bg")
async def remove_background(
    images: List[UploadFile] = File(...),
    format: str = Query("json", description="Output format: 'json' or 'file'")
):
    try:
        results = []
        processed_images = [] # Store raw bytes for file response

        for image in images:
            try:
                input_data = await image.read()
                input_image = Image.open(io.BytesIO(input_data))
                
                car, car_flipped = process_car_image(input_image)
                if car is None:
                    continue
                
                if format == "json":
                    results.append({
                        "filename": image.filename,
                        "images": [
                            {"label": "Original", "data": to_b64(car), "suffix": "original"},
                            {"label": "Mirrored", "data": to_b64(car_flipped), "suffix": "mirrored"}
                        ]
                    })
                else:
                    # For file format, we'll collect the bytes
                    for img, suffix in [(car, "original"), (car_flipped, "mirrored")]:
                        img_byte_arr = io.BytesIO()
                        img.save(img_byte_arr, format='PNG')
                        processed_images.append({
                            "bytes": img_byte_arr.getvalue(),
                            "name": f"{image.filename.split('.')[0]}_{suffix}.png"
                        })
            except Exception as e:
                print(f"Error processing {image.filename}: {e}")
                continue
        
        if format == "json":
            return {"results": results}
        
        # File Format Logic
        if not processed_images:
            raise HTTPException(status_code=400, detail="No images processed")

        # If it's a single processed image requested (though we usually have 2: original + mirrored)
        # or if specifically only one file was produced
        if len(processed_images) == 1:
            return Response(
                content=processed_images[0]["bytes"],
                media_type="image/png",
                headers={"Content-Disposition": f"attachment; filename={processed_images[0]['name']}"}
            )
        
        # If multiple files (which is always the case here since we generate original + mirrored)
        # return a ZIP archive
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for img_info in processed_images:
                zip_file.writestr(img_info["name"], img_info["bytes"])
        
        zip_buffer.seek(0)
        return StreamingResponse(
            zip_buffer,
            media_type="application/x-zip-compressed",
            headers={"Content-Disposition": "attachment; filename=processed_vehicles.zip"}
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
