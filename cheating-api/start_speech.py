"""Start the local reading API after verifying a Speech key entered privately."""

import os
from getpass import getpass

import httpx
import uvicorn


def main():
    region = "japanwest"
    url = f"https://{region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
    print(f"Azure Speech ({region}) - local API on port 8001")
    while True:
        key = getpass("Paste a NEW Azure Speech key here, then press Enter: ").strip()
        if not key:
            print("No key entered.")
            continue
        try:
            response = httpx.post(url, headers={"Ocp-Apim-Subscription-Key": key}, content=b"", timeout=20)
        except (httpx.RequestError, ValueError):
            print("Could not send the request. Check the connection and copied key.")
            continue
        if response.status_code == 200:
            break
        print(f"Azure returned HTTP {response.status_code}. Check the key and resource region.")
    os.environ["AZURE_SPEECH_REGION"] = region
    os.environ["AZURE_SPEECH_KEY"] = key
    print("Azure authentication succeeded. Open http://127.0.0.1:8001/docs")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001)


if __name__ == "__main__":
    main()
