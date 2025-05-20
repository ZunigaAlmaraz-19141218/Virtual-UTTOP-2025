import pandas as pd
import matplotlib.pyplot as plt

# Load the CSV file with segment features (from the previous step)
df = pd.read_csv("movement_segments.csv")

# Simple rule-based detection (adjust thresholds as needed!)
def detect_rotation(segment):
    return (
        segment["acc_y_mean"] > 0.3 and
        segment["acc_xy_mean"] > 0.5 and
        segment["acc_xy_max"] > 1.0
    )

# New column: detected movement
df["detected"] = df.apply(detect_rotation, axis=1)

# Visualization
plt.figure(figsize=(12, 6))

# Plot all segments
plt.scatter(df.index, df["acc_xy_mean"], label="acc_xy_mean", color="blue")

# Highlight detected ROTATION_90_LEFT segments
for i, row in df[df["detected"]].iterrows():
    plt.scatter(i, row["acc_xy_mean"], color="red", label="Detected: ROTATION_90_LEFT" if i == 0 else "")

plt.xlabel("Segment index")
plt.ylabel("XY acceleration (mean)")
plt.title("Detected ROTATION_90_LEFT Segments")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()

# Show detected segments in the console
print("Detected ROTATION_90_LEFT segments:")
print(df[df["detected"]][["event", "acc_y_mean", "acc_xy_mean", "acc_xy_max"]])
