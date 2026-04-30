import traceback
from rembg import remove
from PIL import Image
import io

try:
    img = Image.new('RGB', (100, 100), color = 'red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    data = img_byte_arr.getvalue()
    
    output = remove(data)
    print("SUCCESS")
except Exception as e:
    traceback.print_exc()
