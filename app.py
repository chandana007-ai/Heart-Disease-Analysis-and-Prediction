from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import pickle
import json
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

# Try to import Gemini for AI report
try:
    from google import genai
    GEMINI_AVAILABLE = True
except:
    GEMINI_AVAILABLE = False

app = Flask(__name__)

# Load data
df = pd.read_csv("heart.csv")

# Convert HeartDisease to binary
df['HeartDisease'] = (df['HeartDisease'] == 'Yes').astype(int)

# Load trained model
try:
    model = pickle.load(open("heart_model.pkl", "rb"))
    model_columns = pickle.load(open("model_columns.pkl", "rb"))
except:
    model = None
    model_columns = None

# =====================
# FILTER & QUERY FUNCTIONS
# =====================

def apply_filters(filters):
    """Apply filters to dataframe and return filtered data"""
    filtered_df = df.copy()
    
    if 'age_category' in filters and filters['age_category']:
        filtered_df = filtered_df[filtered_df['AgeCategory'].isin(filters['age_category'])]
    
    if 'sex' in filters and filters['sex']:
        filtered_df = filtered_df[filtered_df['Sex'].isin(filters['sex'])]
    
    if 'smoking' in filters and filters['smoking']:
        filtered_df = filtered_df[filtered_df['Smoking'].isin(filters['smoking'])]
    
    if 'physical_activity' in filters and filters['physical_activity']:
        filtered_df = filtered_df[filtered_df['PhysicalActivity'].isin(filters['physical_activity'])]
    
    if 'gen_health' in filters and filters['gen_health']:
        filtered_df = filtered_df[filtered_df['GenHealth'].isin(filters['gen_health'])]
    
    if 'bmi_range' in filters and filters['bmi_range']:
        min_bmi, max_bmi = filters['bmi_range']
        filtered_df = filtered_df[(filtered_df['BMI'] >= min_bmi) & (filtered_df['BMI'] <= max_bmi)]
    
    return filtered_df

def get_filtered_stats(filtered_df):
    """Calculate statistics for filtered data"""
    total = len(filtered_df)
    if total == 0:
        return None
    
    disease_count = (filtered_df['HeartDisease'] == 1).sum()
    healthy_count = (filtered_df['HeartDisease'] == 0).sum()
    disease_pct = round((disease_count / total) * 100, 1)
    
    return {
        'total': total,
        'disease_count': int(disease_count),
        'healthy_count': int(healthy_count),
        'disease_pct': disease_pct,
        'avg_bmi': round(filtered_df['BMI'].mean(), 1),
        'smoking_pct': round((filtered_df['Smoking'] == 'Yes').sum() / total * 100, 1),
        'stroke_pct': round((filtered_df['Stroke'] == 'Yes').sum() / total * 100, 1)
    }

# =====================
# STATISTICS FUNCTIONS
# =====================

def get_dashboard_stats():
    """Calculate dashboard statistics"""
    total = len(df)
    disease_count = (df['HeartDisease'] == 1).sum()
    healthy_count = (df['HeartDisease'] == 0).sum()
    disease_pct = round((disease_count / total) * 100, 1)
    
    return {
        'total': total,
        'disease_count': int(disease_count),
        'healthy_count': int(healthy_count),
        'disease_pct': disease_pct,
        'avg_bmi': round(df['BMI'].mean(), 1),
        'smoking_pct': round((df['Smoking'] == 'Yes').sum() / total * 100, 1),
        'physical_activity_pct': round((df['PhysicalActivity'] == 'Yes').sum() / total * 100, 1)
    }

def get_age_distribution():
    """Age Category vs Heart Disease distribution"""
    age_categories = ['18-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80 or older']
    age_disease = df.groupby('AgeCategory')['HeartDisease'].agg(['sum', 'count'])
    age_disease['healthy'] = age_disease['count'] - age_disease['sum']
    
    results = []
    for cat in age_categories:
        if cat in age_disease.index:
            results.append({
                'category': cat,
                'disease': int(age_disease.loc[cat, 'sum']),
                'healthy': int(age_disease.loc[cat, 'healthy'])
            })
    
    return {
        'ages': [r['category'] for r in results],
        'disease': [r['disease'] for r in results],
        'healthy': [r['healthy'] for r in results]
    }

def get_gender_distribution():
    """Gender vs Heart Disease"""
    gender_disease = df.groupby('Sex')['HeartDisease'].value_counts().unstack(fill_value=0)
    
    female_data = gender_disease.loc['Female'] if 'Female' in gender_disease.index else [0, 0]
    male_data = gender_disease.loc['Male'] if 'Male' in gender_disease.index else [0, 0]
    
    return {
        'labels': ['Female', 'Male'],
        'disease': [int(female_data.get(1, 0)), int(male_data.get(1, 0))],
        'healthy': [int(female_data.get(0, 0)), int(male_data.get(0, 0))]
    }

def get_lifestyle_stats():
    """Lifestyle factors analysis"""
    disease_df = df[df['HeartDisease'] == 1]
    healthy_df = df[df['HeartDisease'] == 0]
    
    return {
        'smoking_disease': round((disease_df['Smoking'] == 'Yes').sum() / len(disease_df) * 100, 1),
        'smoking_healthy': round((healthy_df['Smoking'] == 'Yes').sum() / len(healthy_df) * 100, 1),
        'activity_disease': round((disease_df['PhysicalActivity'] == 'Yes').sum() / len(disease_df) * 100, 1),
        'activity_healthy': round((healthy_df['PhysicalActivity'] == 'Yes').sum() / len(healthy_df) * 100, 1)
    }

def get_health_distribution():
    """General health distribution"""
    health_dist = df['GenHealth'].value_counts()
    
    return {
        'categories': health_dist.index.tolist(),
        'values': health_dist.values.tolist()
    }

# =====================
# FLASK ROUTES
# =====================

@app.route('/')
def index():
    """Main dashboard page"""
    stats = get_dashboard_stats()
    return render_template('index.html', stats=stats)

@app.route('/api/stats')
def api_stats():
    """Get all statistics"""
    return jsonify({
        'stats': get_dashboard_stats(),
        'age_dist': get_age_distribution(),
        'gender_dist': get_gender_distribution(),
        'lifestyle': get_lifestyle_stats(),
        'health_dist': get_health_distribution()
    })

@app.route('/api/filter', methods=['POST'])
def filter_data():
    """Apply filters and return filtered statistics"""
    filters = request.json
    filtered_df = apply_filters(filters)
    stats = get_filtered_stats(filtered_df)
    
    if stats is None:
        return jsonify({'error': 'No data matches filters'}), 400
    
    return jsonify({
        'stats': stats,
        'record_count': len(filtered_df)
    })

@app.route('/api/get-filters')
def get_filters():
    """Get available filter options"""
    return jsonify({
        'age_categories': sorted(df['AgeCategory'].unique().tolist()),
        'sex': sorted(df['Sex'].unique().tolist()),
        'smoking': sorted(df['Smoking'].unique().tolist()),
        'physical_activity': sorted(df['PhysicalActivity'].unique().tolist()),
        'gen_health': sorted(df['GenHealth'].unique().tolist()),
        'bmi_range': [round(df['BMI'].min(), 1), round(df['BMI'].max(), 1)]
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    """Predict heart disease risk"""
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 400
    
    try:
        data = request.json or {}

        # Build one-hot input dictionary for ALL model columns
        input_dict = {}
        for col in model_columns:
            input_dict[col] = 0

        # BMI: direct numeric
        if 'BMI' in data:
            try:
                input_dict['BMI'] = float(data.get('BMI', 0))
            except:
                input_dict['BMI'] = 20.0

        # Sex: 1=Male, 0=Female
        sex_val = str(data.get('Sex', '0')).strip()
        if sex_val in ['1', '1.0']:
            input_dict['Sex_Male'] = 1
            input_dict['Sex_Female'] = 0
        else:
            input_dict['Sex_Female'] = 1
            input_dict['Sex_Male'] = 0

        # Smoking: 1=Yes, 0=No
        smoke_val = str(data.get('Smoking', '0')).strip()
        if smoke_val in ['1', '1.0']:
            input_dict['Smoking_Yes'] = 1
            input_dict['Smoking_No'] = 0
        else:
            input_dict['Smoking_No'] = 1
            input_dict['Smoking_Yes'] = 0

        # PhysicalActivity: 1=Yes, 0=No
        act_val = str(data.get('PhysicalActivity', '0')).strip()
        if act_val in ['1', '1.0']:
            input_dict['PhysicalActivity_Yes'] = 1
            input_dict['PhysicalActivity_No'] = 0
        else:
            input_dict['PhysicalActivity_No'] = 1
            input_dict['PhysicalActivity_Yes'] = 0

        # Set sensible defaults for non-provided categorical columns
        # These use the first/most common category in most cases
        if 'Race_White' in input_dict:
            all_zero = all(input_dict.get(f'Race_{c}', 0) == 0 for c in ['American Indian/Alaskan Native', 'Asian', 'Black', 'Hispanic', 'Other', 'White'])
            if all_zero:
                input_dict['Race_White'] = 1
        
        if 'Diabetic_No' in input_dict:
            all_zero = all(input_dict.get(f'Diabetic_{c}', 0) == 0 for c in ['No', 'No, borderline diabetes', 'Yes', 'Yes (during pregnancy)'])
            if all_zero:
                input_dict['Diabetic_No'] = 1
        
        if 'GenHealth_Good' in input_dict:
            all_zero = all(input_dict.get(f'GenHealth_{c}', 0) == 0 for c in ['Excellent', 'Fair', 'Good', 'Poor', 'Very good'])
            if all_zero:
                input_dict['GenHealth_Good'] = 1
        
        if 'Asthma_No' in input_dict:
            if input_dict.get('Asthma_No', 0) == 0 and input_dict.get('Asthma_Yes', 0) == 0:
                input_dict['Asthma_No'] = 1
        
        if 'KidneyDisease_No' in input_dict:
            if input_dict.get('KidneyDisease_No', 0) == 0 and input_dict.get('KidneyDisease_Yes', 0) == 0:
                input_dict['KidneyDisease_No'] = 1
        
        if 'SkinCancer_No' in input_dict:
            if input_dict.get('SkinCancer_No', 0) == 0 and input_dict.get('SkinCancer_Yes', 0) == 0:
                input_dict['SkinCancer_No'] = 1
        
        if 'Stroke_No' in input_dict:
            if input_dict.get('Stroke_No', 0) == 0 and input_dict.get('Stroke_Yes', 0) == 0:
                input_dict['Stroke_No'] = 1
        
        if 'AlcoholDrinking_No' in input_dict:
            if input_dict.get('AlcoholDrinking_No', 0) == 0 and input_dict.get('AlcoholDrinking_Yes', 0) == 0:
                input_dict['AlcoholDrinking_No'] = 1

        # Numeric fields
        for key in ['PhysicalHealth', 'MentalHealth', 'SleepTime']:
            if key in input_dict:
                if key in data:
                    try:
                        input_dict[key] = float(data.get(key))
                    except:
                        input_dict[key] = 0 if key != 'SleepTime' else 7
                else:
                    input_dict[key] = 0 if key != 'SleepTime' else 7

        # Create DataFrame with exact column ordering
        input_data = pd.DataFrame([input_dict])
        input_data = input_data[list(model_columns)]

        # Make prediction
        prediction = model.predict(input_data)[0]
        probability = model.predict_proba(input_data)[0]

        # Handle both string and numeric predictions
        # Model may predict 'No' or 'Yes' (strings) or 0 or 1 (numeric)
        if isinstance(prediction, str):
            pred_numeric = 1 if prediction == 'Yes' else 0
        else:
            pred_numeric = int(prediction)

        return jsonify({
            'prediction': pred_numeric,
            'risk': round(float(probability[1]) * 100, 1),
            'healthy_prob': round(float(probability[0]) * 100, 1)
        })
    except Exception as e:
        app.logger.exception('Error during prediction')
        return jsonify({'error': str(e)}), 400

@app.route('/api/data-summary')
def data_summary():
    """Get data summary"""
    summary = {
        'total_records': len(df),
        'columns': df.columns.tolist(),
        'disease_cases': int((df['HeartDisease'] == 1).sum()),
        'healthy_cases': int((df['HeartDisease'] == 0).sum()),
        'age_categories': df['AgeCategory'].nunique(),
        'avg_bmi': round(df['BMI'].mean(), 1)
    }
    return jsonify(summary)

@app.route('/api/generate-report', methods=['POST'])
def generate_report():
    """Generate AI-powered summary report"""
    try:
        filters = request.json.get('filters', {})
        filtered_df = apply_filters(filters)
        stats = get_filtered_stats(filtered_df)
        
        if stats is None:
            return jsonify({'error': 'No data matches filters'}), 400

        # If Gemini is not available, use template
        if not GEMINI_AVAILABLE:
            report = f"""# Heart Disease Analysis Report

## Overview
- **Total Records Analyzed:** {stats['total']}
- **Heart Disease Cases:** {stats['disease_count']} ({stats['disease_pct']}%)
- **Healthy Cases:** {stats['healthy_count']}

## Key Metrics
- **Average BMI:** {stats['avg_bmi']} kg/m²
- **Smoking Rate:** {stats['smoking_pct']}%
- **Stroke Cases:** {stats.get('stroke_pct', 0)}%

## Insights
1. Disease prevalence in this group is {stats['disease_pct']}%
2. Average BMI of {stats['avg_bmi']} suggests lifestyle factors matter
3. Smoking prevalence at {stats['smoking_pct']}% is a significant risk factor

## Recommendations
- Regular health monitoring
- Lifestyle modifications including exercise
- Consultation with healthcare professionals"""
            return jsonify({'report': report, 'source': 'template'})

        # Attemptto generate with Gemini
        try:
            client = genai.Client(api_key="AIzaSyDNLRm6MVA__19HnF7u2uJcyb-tKTgyrxQ")
            prompt = f"""Generate a brief professional health report based on:
Total Records: {stats['total']}, Disease Cases: {stats['disease_count']} ({stats['disease_pct']}%), 
Healthy: {stats['healthy_count']}, Avg BMI: {stats['avg_bmi']}, Smoking: {stats['smoking_pct']}%"""
            response = client.models.generate_content(model="gemini-2.0", contents=prompt)
            return jsonify({'report': response.text, 'source': 'gemini'})
        except:
            app.logger.exception('Gemini failed, using template')
            report = f"""# Heart Disease Analysis Report\n\n## Overview\n- Total: {stats['total']}\n- Disease: {stats['disease_count']} ({stats['disease_pct']}%)\n- BMI: {stats['avg_bmi']}\n- Smoking: {stats['smoking_pct']}%"""
            return jsonify({'report': report, 'source': 'template'})
    except Exception as e:
        app.logger.exception('Report error')
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

