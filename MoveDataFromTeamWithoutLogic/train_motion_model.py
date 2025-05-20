import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv1D, MaxPooling1D, Flatten, Dense, Dropout, BatchNormalization
from tensorflow.keras.utils import to_categorical
from sklearn.model_selection import train_test_split

# === Daten laden ===
X = np.load("X.npy")  # shape: (samples, time_steps, 3)
y = np.load("y.npy")  # shape: (samples, num_classes)

# === Trainings-/Test-Split ===
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# === CNN-Modell definieren ===
model = Sequential([
    Conv1D(64, kernel_size=5, activation='relu', input_shape=X.shape[1:]),
    BatchNormalization(),
    MaxPooling1D(pool_size=2),
    Dropout(0.3),

    Conv1D(128, kernel_size=3, activation='relu'),
    BatchNormalization(),
    MaxPooling1D(pool_size=2),
    Dropout(0.3),

    Flatten(),
    Dense(128, activation='relu'),
    Dropout(0.4),
    Dense(y.shape[1], activation='softmax')  # Multi-Class-Ausgabe
])

model.compile(optimizer='adam',
              loss='categorical_crossentropy',
              metrics=['accuracy'])

model.summary()

# === Training starten ===
history = model.fit(
    X_train, y_train,
    epochs=30,
    batch_size=32,
    validation_data=(X_test, y_test)
)

# === Modell speichern ===
model.save("motion_classifier_cnn.h5")
print("Modell gespeichert als motion_classifier_cnn.h5")
