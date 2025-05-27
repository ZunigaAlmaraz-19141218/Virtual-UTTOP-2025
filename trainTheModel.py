import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense
from tensorflow.keras.utils import to_categorical

# 1. Load the CSV file
df = pd.read_csv("training_dataset.csv")  # Replace with the actual filename

# 2. Separate features (X) and labels (y)
X = df.drop(columns=["label", "base_label", "label_encoded"])  # Input features
y = df["base_label"]  # Use the base label (e.g., 'wait', 'left', etc.)

# 3. Encode labels into numerical format
encoder = LabelEncoder()
y_encoded = encoder.fit_transform(y)
y_categorical = to_categorical(y_encoded)  # Convert to one-hot format for classification

# 4. Split data into training and test sets
X_train, X_test, y_train, y_test = train_test_split(
    X, y_categorical, test_size=0.2, random_state=42
)

# 5. Define the neural network model
model = Sequential([
    Dense(64, activation="relu", input_shape=(X.shape[1],)),  # First hidden layer
    Dense(64, activation="relu"),                             # Second hidden layer
    Dense(y_categorical.shape[1], activation="softmax")       # Output layer for multi-class classification
])

# 6. Compile the model
model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])

# 7. Train the model
model.fit(X_train, y_train, epochs=50, batch_size=16, validation_split=0.1)

# 8. Evaluate the model on test data
loss, acc = model.evaluate(X_test, y_test)
print(f"Test Accuracy: {acc:.2f}")

# 9. Print label-to-index mapping
for i, label in enumerate(encoder.classes_):
    print(f"{i}: {label}")
