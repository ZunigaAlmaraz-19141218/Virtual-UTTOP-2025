import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# Read the CSV file with raw motion data
df = pd.read_csv("TestDataTurn/motion_recording_2025-05-19_15-29-46.csv")

# Convert time to seconds
df["time_s"] = df["time_ms"] / 1000.0

# Identify rows with events (start of each segment)
event_indices = df[df["event"].notna()].index.tolist()

# Target event (e.g., ROTATION_90_LEFT)
target_event = "ROTATION_90_LEFT"

# Extract all segments associated with this event
segments = []
for i in range(len(event_indices)):
    start_idx = event_indices[i]
    if df.loc[start_idx, "event"] != target_event:
        continue
    end_idx = event_indices[i + 1] if i + 1 < len(event_indices) else len(df)
    segment = df.iloc[start_idx+1:end_idx].copy()
    segment.reset_index(drop=True, inplace=True)
    segments.append(segment)

# Limit to a maximum of 25 segments
segments = segments[:25]

# Plot: overlay all segments
fig, axs = plt.subplots(3, 1, figsize=(12, 8), sharex=True)

for segment in segments:
    axs[0].plot(segment.index, segment["acc_x"], alpha=0.6)
    axs[1].plot(segment.index, segment["acc_y"], alpha=0.6)
    axs[2].plot(segment.index, segment["acc_z"], alpha=0.6)

axs[0].set_ylabel("acc_x")
axs[1].set_ylabel("acc_y")
axs[2].set_ylabel("acc_z")
axs[2].set_xlabel("Sample index within segment")

fig.suptitle(f"Motion pattern: {target_event} (max. 25 segments)")
plt.tight_layout()
plt.show()
