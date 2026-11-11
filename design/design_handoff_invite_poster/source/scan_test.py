# Simulate distance + dim light: render at print size (96dpi => the sheet), then shrink as a phone camera would see it, darken, add noise and blur, decode.
import cv2, numpy as np, sys
img = cv2.imread(sys.argv[1])
H = img.shape[0]
for feet in [3, 6, 8, 10, 12]:
    # phone main camera ~ 70deg HFOV, 3024px wide image -> px per inch at distance d(in) = 3024 / (2*d*tan35)
    d = feet * 12
    ppi = 3024 / (2 * d * np.tan(np.radians(35)))
    scale = ppi / 96.0
    small = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    for light in [1.0, 0.25, 0.12]:
        dim = (small.astype(np.float32) * light + np.random.normal(0, 6, small.shape)).clip(0, 255).astype(np.uint8)
        dim = cv2.GaussianBlur(dim, (3, 3), 0.8)
        # pad into a phone-sized frame of dark wall
        frame = np.full((max(dim.shape[0]+200, 600), max(dim.shape[1]+200, 600), 3), int(20*light), np.uint8)
        frame[100:100+dim.shape[0], 100:100+dim.shape[1]] = dim
        val, pts, _ = cv2.QRCodeDetector().detectAndDecode(frame)
        print(f'{feet:>2} ft  light {light:<4}  module {scale*432/37:.1f}px  ->  {val or "FAIL"}')
