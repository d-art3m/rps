# Rock Paper Scissors

An interactive, AI-powered Rock Paper Scissors game. The application uses your webcam and a trained neural network to recognize your hand gestures (Rock, Paper, or Scissors) in real-time.

### Live Demo: https://rps-fawn-kappa.vercel.app/

## Tech Stack

- **Frontend:** React, Vite, CSS
- **AI/ML Inference:** ONNX Runtime Web (`onnxruntime-web`)
- **Model Training:** Python, PyTorch, Jupyter Notebook

## Project Structure

- **`/client`**: Contains the React application.
- **`/outputs`**: The compiled neural network model used by the client app.
- **`/data`**: Contains the dataset of hand gestures used to train the model.
- **`rps_cnn_training.ipynb`**: A Jupyter Notebook for training the CNN model using PyTorch.

## Getting Started

### 1. Running the Web Application

The web interface is built with React. To run it locally:

```bash
cd client
npm install
npm run dev
```

This will start a local development server (`http://localhost:5173`).

### 2. Training the Model (Optional)

If you want to train your own version of the gesture recognition model:

1. Ensure you have Python and Jupyter installed.
2. Open `rps_cnn_training.ipynb`.
3. Follow the instructions in the notebook to prepare your dataset, train the PyTorch model, and export it to ONNX format.
4. Replace the existing `outputs` folder in the project with the newly generated one.