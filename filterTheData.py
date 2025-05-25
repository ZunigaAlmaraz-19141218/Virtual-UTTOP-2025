import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder

# Function: Moving average filter
def moving_average(series, window_size=5):
    return series.rolling(window=window_size, center=True, min_periods=1).mean()

# Feature extraction for each segment
def extract_extended_features(segment):
    return pd.Series({
        'mean_acc_x': segment['acc_x'].mean(),
        'mean_acc_y': segment['acc_y'].mean(),
        'mean_acc_z': segment['acc_z'].mean(),
        'std_acc_x': segment['acc_x'].std(),
        'std_acc_y': segment['acc_y'].std(),
        'std_acc_z': segment['acc_z'].std(),
        'min_acc_x': segment['acc_x'].min(),
        'max_acc_x': segment['acc_x'].max(),
        'range_acc_y': segment['acc_y'].max() - segment['acc_y'].min(),
        'energy_acc_z': np.sum(segment['acc_z']**2),
        'mean_gyro_x': segment['gyro_x'].mean(),
        'std_gyro_y': segment['gyro_y'].std(),
        'max_gyro_z': segment['gyro_z'].max(),
        'label': segment['label'].iloc[0]
    })

# Main function: Read, filter, append, delete, and create training dataset
def process_and_filter_csv(input_dir, filtered_output_file, features_output_file):
    files = [f for f in os.listdir(input_dir) if f.endswith(".csv")]

    if not files:
        print("No CSV files found in the directory.")
        return

    all_filtered_data = []

    for file_name in files:
        file_path = os.path.join(input_dir, file_name)
        print("Processing file:", file_name.encode('ascii', errors='ignore').decode())
        
        try:
            df = pd.read_csv(file_path, encoding='utf-8')
        except UnicodeDecodeError:
            print(f"UTF-8 failed for {file_name}, trying ISO-8859-1")
            df = pd.read_csv(file_path, encoding='ISO-8859-1')


        # Apply moving average filter to sensor axes
        for col in ['acc_x', 'acc_y', 'acc_z', 'gyro_x', 'gyro_y', 'gyro_z']:
            if col in df.columns:
                df[col] = moving_average(df[col])

        # Append filtered data to output file, or create new if it doesn't exist
        if os.path.exists(filtered_output_file):
            df.to_csv(filtered_output_file, mode='a', index=False, header=False)
        else:
            df.to_csv(filtered_output_file, index=False)

        all_filtered_data.append(df)
        os.remove(file_path)
        print(f"{file_name} has been deleted.")

    print(f"All files processed and saved to {filtered_output_file}.")

    # Combine all filtered data and extract features
    full_df = pd.concat(all_filtered_data, ignore_index=True)
    features_df = full_df.groupby("segment_id").apply(extract_extended_features).reset_index(drop=True)

    # Encode labels numerically for ML usage
    le = LabelEncoder()
    features_df['label_encoded'] = le.fit_transform(features_df['label'])

    # Save training dataset
    features_df.to_csv(features_output_file, index=False)
    print(f"Feature dataset saved to {features_output_file}.")

# Paths
input_directory = "toDoFilterData"
filtered_csv = "filteredUserData.csv"
features_csv = "training_dataset.csv"

os.makedirs(input_directory, exist_ok=True)

# Run processing
process_and_filter_csv(input_directory, filtered_csv, features_csv)
