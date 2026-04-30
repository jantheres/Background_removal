from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from rembg import remove, new_session
from PIL import Image, ImageOps, ImageEnhance
import io
import traceback
import base64
from typing import List

app = FastAPI(title="Automotive Catalog API")

# Pre-initialize sessions for better performance
models = {
    "isnet": new_session("isnet-general-use"),
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
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
    # Ensure RGB for background removal
    if input_image.mode != "RGB":
        input_image = input_image.convert("RGB")
        
    no_bg = remove(input_image, session=models["isnet"], alpha_matting=True)
    
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
async def remove_background(image: UploadFile = File(...)):
    try:
        input_data = await image.read()
        input_image = Image.open(io.BytesIO(input_data))
        
        car, car_flipped = process_car_image(input_image)
        if car is None:
            raise HTTPException(status_code=400, detail="No vehicle detected")
            
        return {
            "filename": image.filename,
            "images": [
                {"label": "Original", "data": to_b64(car), "suffix": "original"},
                {"label": "Mirrored", "data": to_b64(car_flipped), "suffix": "mirrored"}
            ]
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/remove-bg-batch")
async def remove_background_batch(images: List[UploadFile] = File(...)):
    try:
        results = []
        for image in images:
            try:
                input_data = await image.read()
                input_image = Image.open(io.BytesIO(input_data))
                
                car, car_flipped = process_car_image(input_image)
                if car is None:
                    continue
                
                results.append({
                    "filename": image.filename,
                    "images": [
                        {"label": "Original", "data": to_b64(car), "suffix": "original"},
                        {"label": "Mirrored", "data": to_b64(car_flipped), "suffix": "mirrored"}
                    ]
                })
            except Exception as e:
                print(f"Error processing {image.filename}: {e}")
                continue
                
        return {"results": results}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
