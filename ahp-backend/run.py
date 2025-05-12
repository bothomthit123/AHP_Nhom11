import uvicorn

if __name__ == "__main__":
    # Run the FastAPI application with Uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
