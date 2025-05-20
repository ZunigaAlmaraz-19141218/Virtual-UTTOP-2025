import pandas as pd
import numpy as np

# Read the CSV file
df = pd.read_csv("TestDataTurn/motion_recording_2025-05-19_15-29-46.csv")

# Convert time to seconds
df["time_s"] = df["time_ms"] / 1000.0

# Calculate XY acceleration magnitude
df["acc_xy"] = np.sqrt(df["acc_x"]**2 + df["acc_y"]**2)

# Identify rows where an event occurs (start of a segment)
event_indices = df[df["event"].notna()].index.tolist()

segments = []

# Iterate through all segments
for i in range(len(event_indices)):
    start_idx = event_indices[i]
    end_idx = event_indices[i + 1] if i + 1 < len(event_indices) else len(df)

    segment = df.iloc[start_idx+1:end_idx].copy()
    label = df.loc[start_idx, "event"]

    if not segment.empty:
        features = {
            "event": label,
            "num_samples": len(segment),
            "acc_x_mean": segment["acc_x"].mean(),
            "acc_y_mean": segment["acc_y"].mean(),
            "acc_z_mean": segment["acc_z"].mean(),
            "acc_xy_mean": segment["acc_xy"].mean(),
            "acc_x_std": segment["acc_x"].std(),
            "acc_y_std": segment["acc_y"].std(),
            "acc_z_std": segment["acc_z"].std(),
            "acc_xy_std": segment["acc_xy"].std(),
            "acc_x_max": segment["acc_x"].max(),
            "acc_y_max": segment["acc_y"].max(),
            "acc_z_max": segment["acc_z"].max(),
            "acc_xy_max": segment["acc_xy"].max(),
            "acc_x_min": segment["acc_x"].min(),
            "acc_y_min": segment["acc_y"].min(),
            "acc_z_min": segment["acc_z"].min(),
            "acc_xy_min": segment["acc_xy"].min()
        }
        segments.append(features)

# Create a DataFrame from the segments
segment_df = pd.DataFrame(segments)

# Print the result
print(segment_df)

# Optionally: export to CSV
segment_df.to_csv("movement_segments.csv", index=False)
