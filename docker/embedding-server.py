#!/usr/bin/env python3

import os
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
import numpy as np

app = Flask(__name__)

# Load the model
model_name = os.getenv('MODEL_ID', 'sentence-transformers/all-MiniLM-L6-v2')
print(f"Loading model: {model_name}")
model = SentenceTransformer(model_name)
print("Model loaded successfully!")

@app.route('/embed', methods=['POST'])
def embed():
    try:
        data = request.get_json()
        
        if not data or 'inputs' not in data:
            return jsonify({'error': 'Missing inputs field'}), 400
            
        inputs = data['inputs']
        
        # Handle both single string and list of strings
        if isinstance(inputs, str):
            texts = [inputs]
        else:
            texts = inputs
            
        # Generate embeddings
        embeddings = model.encode(texts)
        
        # Convert to list for JSON serialization
        if isinstance(inputs, str):
            # Return single embedding
            return jsonify(embeddings[0].tolist())
        else:
            # Return list of embeddings
            return jsonify([emb.tolist() for emb in embeddings])
            
    except Exception as e:
        print(f"Error generating embeddings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': model_name})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8088))
    print(f"Starting embedding server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)