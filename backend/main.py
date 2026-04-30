from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from rembg import remove, new_session
from PIL import Image
import io
import traceback

app = FastAPI(title="Background Removal API")

# Pre-initialize sessions for better performance and quality
# Using isnet-general-use as it often provides better results than default u2net
models = {
    "isnet": new_session("isnet-general-use"),
    "u2net": new_session("u2net")
}

# Allow the frontend to communicate with our backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Background Removal API is running!"}

@app.post("/remove-bg")
async def remove_background(image: UploadFile = File(...)):
    try:
        # Read the uploaded image bytes
        input_data = await image.read()
        
        # Convert to PIL Image
        input_image = Image.open(io.BytesIO(input_data))
        
        # Speed Optimization: Resize if the image is too large
        # Alpha matting is very slow on high-res images
        MAX_SIZE = 1500
        if max(input_image.size) > MAX_SIZE:
            input_image.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)
            print(f"Resized image to {input_image.size} for faster processing")
            
        # Using ISNet (High Quality) by default
        session = models["isnet"]
        
        try:
            # Try with Alpha Matting for the "Perfect" look
            output_image = remove(
                input_image,
                session=session,
                alpha_matting=True,
                alpha_matting_foreground_threshold=240,
                alpha_matting_background_threshold=10,
                alpha_matting_erode_size=10
            )
        except Exception as matting_error:
            # Fallback if Alpha Matting fails
            print(f"Alpha matting failed, falling back to standard removal: {matting_error}")
            output_image = remove(
                input_image,
                session=session,
                alpha_matting=False
            )
        
        # Convert back to PNG bytes
        img_byte_arr = io.BytesIO()
        output_image.save(img_byte_arr, format='PNG')
        output_data = img_byte_arr.getvalue()
        
        return Response(content=output_data, media_type="image/png")
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
