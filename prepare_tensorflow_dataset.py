import os
import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt
from sklearn.preprocessing import OneHotEncoder

# === Konfiguration ===
input_folder = "MoveDataFromTeam/"
butter_order = 4
cutoff_hz = 3.0
segment_min_length = 20      # Minimalanzahl an Zeilen pro Segment
segment_max_length = 100     # Ziel-Länge pro Sample (wird gepadded/gecuttet)
output_X = "X.npy"
output_y = "y.npy"

# === Filterfunktion ===
def butterworth_filter(df, fs):
    b, a = butter(butter_order, cutoff_hz / (0.5 * fs), btype='low')
    for axis in ["acc_x", "acc_y", "acc_z"]:
        if axis in df.columns:
            df[axis] = filtfilt(b, a, df[axis])
    return df

# === Segmentieren nach Labels ===
def extract_labeled_segments(df):
    segments = []
    labels = []
    current = []
    current_label = None

    for _, row in df.iterrows():
        label = str(row["label"]).strip()
        if label != "":
            if current_label is None:
                current = [row]
                current_label = label
            elif label == current_label:
                current.append(row)
            else:
                if len(current) >= segment_min_length:
                    segments.append(pd.DataFrame(current))
                    labels.append(current_label)
                current = [row]
                current_label = label
        else:
            if current and len(current) >= segment_min_length:
                segments.append(pd.DataFrame(current))
                labels.append(current_label)
            current = []
            current_label = None

    # letztes offenes Segment speichern
    if current and len(current) >= segment_min_length:
        segments.append(pd.DataFrame(current))
        labels.append(current_label)

    return segments, labels

# === Hauptprozess ===
all_segments = []
all_labels = []

for filename in os.listdir(input_folder):
    if not filename.endswith(".csv"):
        continue

    df = pd.read_csv(os.path.join(input_folder, filename))
    if "label" not in df.columns or "time_ms" not in df.columns:
        continue

    df["label"] = df["label"].fillna("").astype(str)
    df["time_s"] = df["time_ms"] / 1000.0
    fs = 1 / df["time_s"].diff().mean()

    df = butterworth_filter(df, fs)

    segments, labels = extract_labeled_segments(df)
    for seg in segments:
        # Nur relevante Features behalten
        sample = seg[["acc_x", "acc_y", "acc_z"]].to_numpy()

        # Padding oder Kürzen
        if sample.shape[0] < segment_max_length:
            pad_width = segment_max_length - sample.shape[0]
            padded = np.pad(sample, ((0, pad_width), (0, 0)), mode='constant')
        else:
            padded = sample[:segment_max_length]

        all_segments.append(padded)

    all_labels.extend(labels)

# === In NumPy konvertieren ===
X = np.stack(all_segments)  # shape: (n_samples, segment_max_length, 3)

# One-Hot-Encoding für Labels
encoder = OneHotEncoder(sparse_output=False)
y = encoder.fit_transform(np.array(all_labels).reshape(-1, 1))

# === Speichern ===
np.save(output_X, X)
np.save(output_y, y)

print(f"Fertig! Gespeichert:\n  {output_X}: {X.shape}\n  {output_y}: {y.shape}")
print("Klassen:", encoder.categories_[0].tolist())
