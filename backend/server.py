from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import pydicom
from PIL import Image
import numpy as np
from io import BytesIO
import base64
import os


# Initialize Flask app
app = Flask(__name__)

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///dicom_files.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["UPLOAD_FOLDER"] = "uploads"

# Initialize database
db = SQLAlchemy(app)
CORS(app)

if not os.path.exists(app.config["UPLOAD_FOLDER"]):
    os.makedirs(app.config["UPLOAD_FOLDER"])

# Database model for storing DICOM files
class DICOMFile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    dicom_metadata = db.Column(db.JSON, nullable=False)
    image_data = db.Column(db.Text, nullable=True) # Base64-encoded image
    file_path = db.Column(db.String(255), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "metadata": self.dicom_metadata,
            "imageSrc": self.image_data,
            "fileUrl": self.file_path,
        }

# Create tables if not exist
with app.app_context():
    db.create_all()

@app.route("/")
def home():
    return "Welcome!"

@app.route("/upload", methods=["POST"])
def upload_dicom():
    try:
        if "file" not in request.files: # check if ever uploaded
            return jsonify({"error": "No file part"}), 400

        file = request.files["file"]
        
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        dicom_data = pydicom.dcmread(file) # read file

        if "PixelData" not in dicom_data:
            return jsonify({"error": "No pixel data in DICOM file"}), 400

        # Extract metadata
        metadata = {
            "Patient's Name": str(dicom_data.PatientName) if "PatientName" in dicom_data else "N/A",
            "Patient's Birth Date": str(dicom_data.PatientBirthDate) if "PatientBirthDate" in dicom_data else "N/A",
            "Series Description": str(dicom_data.SeriesDescription) if "SeriesDescription" in dicom_data else "N/A",
        }  

        # Convert DICOM image to PNG in grayscale
        array = dicom_data.pixel_array
        image = Image.fromarray(np.uint8(array / np.max(array) * 255))
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        image_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

        # Save the file to the server's file system
        dicom_filename = f"uploads/{file.filename}"
        file.save(dicom_filename)

        # Save file to database
        dicom_entry = DICOMFile(filename=file.filename, dicom_metadata=metadata, image_data=image_base64, file_path=dicom_filename)
        db.session.add(dicom_entry)
        db.session.commit()

        return jsonify({
            "message": "DICOM file uploaded and processed successfully!",
            "metadata": metadata,
            "imageSrc": image_base64,
            "fileUrl": f"http://localhost:5000/{dicom_filename}",
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/files", methods=["GET"])
def get_uploaded_files():
    """Retrieve all uploaded DICOM files"""
    try:
        files = DICOMFile.query.all()
        return jsonify([file.to_dict() for file in files])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/files/<int:file_id>", methods=["GET"])
def get_file_by_id(file_id):
    """Retrieve a specific file by ID"""
    try:
        file = DICOMFile.query.get(file_id)
        if not file:
            return jsonify({"error": "File not found"}), 404
        
        return jsonify(file.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory('uploads', filename)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
