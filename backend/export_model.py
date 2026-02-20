import joblib
import csv
import os
from ml_model import CrisisForgeMLModel, generate_training_data, FEATURE_NAMES

def export_model_and_data():
    print("Generating dataset and training model...")
    # 1. Train the model manually
    model = CrisisForgeMLModel()
    model.train(n_samples=5000)
    
    # 2. Export the trained models using joblib
    export_path = "crisisforge_model.joblib"
    joblib.dump({
        "outcome_model": model.outcome_model,
        "resource_model": model.resource_model,
        "features": FEATURE_NAMES,
        "metrics": model.metrics
    }, export_path)
    
    print(f"✅ ML Model successfully exported to: {os.path.abspath(export_path)}")
    
    # 3. Generate dataset and save to CSV
    X, y_outcome, y_resource = generate_training_data(n_samples=5000, seed=42)
    csv_path = "crisisforge_patient_data.csv"
    
    with open(csv_path, mode="w", newline="") as file:
        writer = csv.writer(file)
        # Write headers
        headers = FEATURE_NAMES + ["outcome_label", "resource_hours_needed"]
        writer.writerow(headers)
        
        # Write 5000 rows
        for i in range(len(X)):
            row = list(X[i]) + [int(y_outcome[i]), round(float(y_resource[i]), 1)]
            writer.writerow(row)
            
    print(f"✅ Training Dataset successfully exported to: {os.path.abspath(csv_path)}")

if __name__ == "__main__":
    export_model_and_data()
