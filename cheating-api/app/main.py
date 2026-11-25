from fastapi import FastAPI

from app.routes.detection import router as detection_router
from app.routes.reading import router as reading_router
from app.routes.rubrics import router as rubric_router

app = FastAPI(
    title="API chấm bài đọc tiếng Việt",
    version="0.1.0",
    swagger_ui_parameters={"defaultModelsExpandDepth": -1},
)

app.include_router(reading_router)
app.include_router(detection_router, include_in_schema=False)
app.include_router(rubric_router, include_in_schema=False)


@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}