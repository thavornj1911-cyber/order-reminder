import http.server
import socketserver
import socket
import webbrowser
import os

PORT = 8080

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and caching headers for PWA
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_ip()

    print("=" * 60)
    print("🚀 ระบบแจ้งเตือนสั่งของ (Order Reminder Web App)")
    print("=" * 60)
    print(f"💻 เปิดบนคอมพิวเตอร์นี้:  http://localhost:{PORT}")
    print(f"📱 เปิดบนมือถือ (WiFi เดียวกัน): http://{local_ip}:{PORT}")
    print("=" * 60)
    print("💡 ข้อแนะนำสำหรับการเปิดดูบนมือถือตลอด 24 ชม. แม้ปิดคอมพิวเตอร์:")
    print("   ดูรายละเอียดและวิธีนำขึ้น Cloud (Netlify / Vercel / GitHub Pages ฟรี)")
    print("   ได้ที่ไฟล์ DEPLOY_GUIDE.md หรือกดปุ่ม 'เปิดบนมือถือ (24 ชม.)' ในหน้าเว็บ")
    print("=" * 60)
    print("กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์")

    webbrowser.open(f"http://localhost:{PORT}")

    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nปิดเซิร์ฟเวอร์เรียบร้อยแล้ว")

if __name__ == '__main__':
    main()
