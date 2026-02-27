import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import pickle

# Load dataset
df = pd.read_csv("heart.csv")

# Features and target
X = df.drop("HeartDisease", axis=1)
y = df["HeartDisease"]

# Convert categorical columns to numbers
X = pd.get_dummies(X)

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
model = RandomForestClassifier()
model.fit(X_train, y_train)

# Save model
pickle.dump(model, open("heart_model.pkl", "wb"))
# Save feature columns
pickle.dump(X.columns, open("model_columns.pkl", "wb"))

print("Model trained and saved successfully!")