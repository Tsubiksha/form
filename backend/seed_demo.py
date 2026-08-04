#!/usr/bin/env python3
"""
seed_demo.py — Professional Demo Seed Script for FormFlow
========================================================
Generates realistic, referentially-intact demo data:
  • 1 demo user (+ keeps any existing admin)
  • 6 business forms, each with 5 versions
  • 20–75 realistic responses per published form
  • Share links, export jobs, audit logs
  • All timestamps are real UTC datetimes — no hardcoded strings

Run from the backend directory:
    python seed_demo.py          # seeds fresh data (safe to re-run)
    python seed_demo.py --wipe   # drops ALL existing data first
"""

import argparse
import json
import random
import secrets
import sys
import os
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Bootstrap path so we can import app modules
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal, engine, Base
from app.models.audit_log import AuditLog
from app.models.export_job import ExportJob
from app.models.field import Field
from app.models.field_option import FieldOption
from app.models.form import Form
from app.models.form_version import FormVersion
from app.models.share_link import ShareLink
from app.models.submission import FormSubmission, SubmissionValue
from app.models.user import User, UserRole
from app.models.validation_rule import ValidationRule
from app.core.security import hash_password

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
NOW = datetime.utcnow()

def days_ago(n: float) -> datetime:
    return NOW - timedelta(days=n)

def rand_dt(start_days: float, end_days: float) -> datetime:
    """Random datetime between start_days and end_days ago."""
    seconds = random.uniform(end_days * 86400, start_days * 86400)
    return NOW - timedelta(seconds=seconds)

def rand_ip() -> str:
    return f"{random.randint(10,200)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"

def rand_token() -> str:
    return secrets.token_urlsafe(24)

def rand_fingerprint() -> str:
    return secrets.token_hex(20)

# ---------------------------------------------------------------------------
# Respondent pool (realistic names + emails)
# ---------------------------------------------------------------------------
RESPONDENTS = [
    ("Aarav Mehta",        "aarav.mehta@gmail.com"),
    ("Priya Sharma",       "priya.sharma@outlook.com"),
    ("Rohan Verma",        "rohan.verma@yahoo.com"),
    ("Sneha Iyer",         "sneha.iyer@gmail.com"),
    ("Karthik Nair",       "karthik.nair@protonmail.com"),
    ("Divya Krishnan",     "divya.krishnan@hotmail.com"),
    ("Arjun Patel",        "arjun.patel@gmail.com"),
    ("Meera Reddy",        "meera.reddy@outlook.com"),
    ("Vikram Singh",       "vikram.singh@gmail.com"),
    ("Ananya Gupta",       "ananya.gupta@rediffmail.com"),
    ("Siddharth Joshi",    "siddharth.joshi@gmail.com"),
    ("Kavya Pillai",       "kavya.pillai@yahoo.com"),
    ("Rahul Bose",         "rahul.bose@gmail.com"),
    ("Nisha Tiwari",       "nisha.tiwari@outlook.com"),
    ("Amit Choudhary",     "amit.choudhary@gmail.com"),
    ("Pooja Bhatt",        "pooja.bhatt@gmail.com"),
    ("Gaurav Yadav",       "gaurav.yadav@hotmail.com"),
    ("Ritika Malhotra",    "ritika.malhotra@gmail.com"),
    ("Suresh Babu",        "suresh.babu@protonmail.com"),
    ("Lakshmi Venkat",     "lakshmi.venkat@yahoo.com"),
    ("Manish Kapoor",      "manish.kapoor@gmail.com"),
    ("Deepa Srinivas",     "deepa.srinivas@outlook.com"),
    ("Nikhil Khanna",      "nikhil.khanna@gmail.com"),
    ("Ritu Aggarwal",      "ritu.aggarwal@rediffmail.com"),
    ("Vijay Ramesh",       "vijay.ramesh@gmail.com"),
    ("Sunita Mishra",      "sunita.mishra@outlook.com"),
    ("Rajesh Kumar",       "rajesh.kumar@gmail.com"),
    ("Hema Subramaniam",   "hema.subramaniam@yahoo.com"),
    ("Aditya Ghosh",       "aditya.ghosh@gmail.com"),
    ("Swati Bansal",       "swati.bansal@hotmail.com"),
    ("Pankaj Dubey",       "pankaj.dubey@gmail.com"),
    ("Rekha Narayanan",    "rekha.narayanan@yahoo.com"),
    ("Tarun Saxena",       "tarun.saxena@gmail.com"),
    ("Archana Pandey",     "archana.pandey@outlook.com"),
    ("Vishal Mathur",      "vishal.mathur@gmail.com"),
    ("Geeta Chawla",       "geeta.chawla@protonmail.com"),
    ("Harish Jain",        "harish.jain@gmail.com"),
    ("Pallavi Shetty",     "pallavi.shetty@yahoo.com"),
    ("Sanjay Desai",       "sanjay.desai@gmail.com"),
    ("Usha Hegde",         "usha.hegde@outlook.com"),
    ("Manoj Tripathi",     "manoj.tripathi@gmail.com"),
    ("Sheetal Rao",        "sheetal.rao@rediffmail.com"),
    ("Narendra Patil",     "narendra.patil@gmail.com"),
    ("Alka Goel",          "alka.goel@outlook.com"),
    ("Rajan Menon",        "rajan.menon@gmail.com"),
    ("Shalini Tomar",      "shalini.tomar@yahoo.com"),
    ("Bharat Chauhan",     "bharat.chauhan@gmail.com"),
    ("Kamla Devi",         "kamla.devi@hotmail.com"),
    ("Ashish Walia",       "ashish.walia@gmail.com"),
    ("Rina Bhatia",        "rina.bhatia@protonmail.com"),
    ("Mohit Garg",         "mohit.garg@gmail.com"),
    ("Sarla Pandey",       "sarla.pandey@yahoo.com"),
    ("Dinesh Ahuja",       "dinesh.ahuja@gmail.com"),
    ("Vandana Rawat",      "vandana.rawat@outlook.com"),
    ("Sunil Wadhwa",       "sunil.wadhwa@gmail.com"),
    ("Lalita Thakur",      "lalita.thakur@rediffmail.com"),
    ("Sumit Batra",        "sumit.batra@gmail.com"),
    ("Renu Saxena",        "renu.saxena@outlook.com"),
    ("Kapil Dhawan",       "kapil.dhawan@gmail.com"),
    ("Anita Kohli",        "anita.kohli@yahoo.com"),
    ("Hemant Bisht",       "hemant.bisht@gmail.com"),
    ("Preeti Sethi",       "preeti.sethi@hotmail.com"),
    ("Vinod Saini",        "vinod.saini@gmail.com"),
    ("Rashmi Bajaj",       "rashmi.bajaj@protonmail.com"),
    ("Girish Lal",         "girish.lal@gmail.com"),
    ("Mona Mathews",       "mona.mathews@outlook.com"),
    ("Pranav Shukla",      "pranav.shukla@gmail.com"),
    ("Fatima Khan",        "fatima.khan@gmail.com"),
    ("Yusuf Sheikh",       "yusuf.sheikh@outlook.com"),
    ("Ayesha Mirza",       "ayesha.mirza@yahoo.com"),
    ("Imran Siddiqui",     "imran.siddiqui@gmail.com"),
    ("Zara Hussain",       "zara.hussain@protonmail.com"),
    ("Arjun Pillai",       "arjun.pillai@gmail.com"),
    ("Charlotte Davies",   "charlotte.davies@gmail.com"),
    ("James Wilson",       "james.wilson@outlook.com"),
    ("Sophia Anderson",    "sophia.anderson@yahoo.com"),
]

# ---------------------------------------------------------------------------
# Form definitions — 6 realistic business forms
# ---------------------------------------------------------------------------
FORM_DEFINITIONS = [

    # 1 ── Employee Quarterly Feedback Survey (published, 55 responses)
    {
        "title":       "Employee Quarterly Feedback Survey",
        "description": "Quarterly pulse survey to measure employee satisfaction, engagement, and suggestions for improvement across all departments.",
        "status":      "published",
        "created_days_ago": 90,
        "response_count": 55,
        "response_window": (2, 88),   # responses spread across this window
        "version_history": [
            ("Initial draft with basic satisfaction fields", "draft"),
            ("Added department filter and open-text suggestions field", "draft"),
            ("Added 5-point scale and conditional routing", "draft"),
            ("Revised section headings and improved layout flow", "draft"),
            ("Final review complete — published to all employees", "published"),
        ],
        "fields": [
            {"label": "Full Name",            "type": "text",     "required": True,  "placeholder": "Enter your full name"},
            {"label": "Department",           "type": "dropdown", "required": True,  "options": ["Engineering", "Marketing", "HR", "Finance", "Operations", "Sales", "Design", "Legal"]},
            {"label": "Job Role",             "type": "text",     "required": True,  "placeholder": "e.g. Senior Software Engineer"},
            {"label": "Years at Company",     "type": "dropdown", "required": True,  "options": ["Less than 1 year", "1–2 years", "3–5 years", "6–10 years", "More than 10 years"]},
            {"label": "Overall Satisfaction", "type": "rating",   "required": True,  "max": 5},
            {"label": "Work-Life Balance",    "type": "rating",   "required": True,  "max": 5},
            {"label": "Management Support",   "type": "rating",   "required": True,  "max": 5},
            {"label": "Growth Opportunities", "type": "rating",   "required": True,  "max": 5},
            {"label": "Best aspect of working here", "type": "textarea", "required": False, "placeholder": "What do you enjoy most about your role?"},
            {"label": "Suggestions for Improvement",  "type": "textarea", "required": False, "placeholder": "Share any ideas that would improve your experience."},
            {"label": "Would you recommend this company?", "type": "radio", "required": True, "options": ["Definitely yes", "Probably yes", "Neutral", "Probably not", "Definitely not"]},
        ],
        "response_samples": [
            {"Full Name": "Aarav Mehta",     "Department": "Engineering",  "Job Role": "Software Engineer",     "Years at Company": "1–2 years",       "Overall Satisfaction": "4", "Work-Life Balance": "3", "Management Support": "4", "Growth Opportunities": "4", "Would you recommend this company?": "Definitely yes"},
            {"Full Name": "Priya Sharma",    "Department": "Marketing",    "Job Role": "Content Strategist",   "Years at Company": "3–5 years",       "Overall Satisfaction": "5", "Work-Life Balance": "4", "Management Support": "5", "Growth Opportunities": "5", "Would you recommend this company?": "Definitely yes"},
            {"Full Name": "Rohan Verma",     "Department": "HR",           "Job Role": "HR Business Partner",  "Years at Company": "6–10 years",      "Overall Satisfaction": "3", "Work-Life Balance": "3", "Management Support": "3", "Growth Opportunities": "2", "Would you recommend this company?": "Neutral"},
            {"Full Name": "Sneha Iyer",      "Department": "Finance",      "Job Role": "Financial Analyst",    "Years at Company": "1–2 years",       "Overall Satisfaction": "4", "Work-Life Balance": "4", "Management Support": "4", "Growth Opportunities": "3", "Would you recommend this company?": "Probably yes"},
            {"Full Name": "Karthik Nair",    "Department": "Engineering",  "Job Role": "DevOps Engineer",      "Years at Company": "3–5 years",       "Overall Satisfaction": "5", "Work-Life Balance": "5", "Management Support": "5", "Growth Opportunities": "5", "Would you recommend this company?": "Definitely yes"},
            {"Full Name": "Divya Krishnan",  "Department": "Design",       "Job Role": "UX Designer",          "Years at Company": "1–2 years",       "Overall Satisfaction": "4", "Work-Life Balance": "4", "Management Support": "4", "Growth Opportunities": "4", "Would you recommend this company?": "Definitely yes"},
            {"Full Name": "Arjun Patel",     "Department": "Sales",        "Job Role": "Account Executive",    "Years at Company": "Less than 1 year","Overall Satisfaction": "3", "Work-Life Balance": "2", "Management Support": "3", "Growth Opportunities": "3", "Would you recommend this company?": "Neutral"},
            {"Full Name": "Meera Reddy",     "Department": "Operations",   "Job Role": "Operations Manager",   "Years at Company": "6–10 years",      "Overall Satisfaction": "5", "Work-Life Balance": "4", "Management Support": "5", "Growth Opportunities": "4", "Would you recommend this company?": "Definitely yes"},
        ],
    },

    # 2 ── Customer Satisfaction Survey (published, 72 responses)
    {
        "title":       "Customer Satisfaction Survey — Q2 2026",
        "description": "Post-purchase survey sent to customers to evaluate product quality, delivery experience, and overall brand satisfaction.",
        "status":      "published",
        "created_days_ago": 75,
        "response_count": 72,
        "response_window": (1, 73),
        "version_history": [
            ("Initial customer satisfaction draft", "draft"),
            ("Added NPS score field and purchase category filter", "draft"),
            ("Included conditional 'What went wrong?' section for low scores", "draft"),
            ("Polished heading copy and reordered questions per UX review", "draft"),
            ("Approved by product team — published to customer database", "published"),
        ],
        "fields": [
            {"label": "Your Name",                "type": "text",     "required": False, "placeholder": "Optional — leave blank to stay anonymous"},
            {"label": "Email Address",            "type": "email",    "required": False, "placeholder": "name@example.com"},
            {"label": "Product Purchased",        "type": "dropdown", "required": True,  "options": ["FormFlow Pro", "FormFlow Business", "FormFlow Enterprise", "FormFlow API Add-on", "Custom Integration Package"]},
            {"label": "Overall Satisfaction",     "type": "rating",   "required": True,  "max": 5},
            {"label": "Product Quality",          "type": "rating",   "required": True,  "max": 5},
            {"label": "Delivery / Onboarding",    "type": "rating",   "required": True,  "max": 5},
            {"label": "Customer Support",         "type": "rating",   "required": True,  "max": 5},
            {"label": "Value for Money",          "type": "rating",   "required": True,  "max": 5},
            {"label": "NPS — How likely are you to recommend us? (0–10)", "type": "text", "required": True, "placeholder": "Enter a number from 0 to 10"},
            {"label": "What did we do well?",     "type": "textarea", "required": False},
            {"label": "What could we improve?",   "type": "textarea", "required": False},
            {"label": "Would you purchase again?","type": "radio",    "required": True,  "options": ["Yes, definitely", "Possibly", "No"]},
        ],
        "response_samples": [
            {"Your Name": "Rajesh Kumar",    "Product Purchased": "FormFlow Pro",         "Overall Satisfaction": "5", "Product Quality": "5", "Delivery / Onboarding": "4", "Customer Support": "5", "Value for Money": "5", "NPS — How likely are you to recommend us? (0–10)": "10", "Would you purchase again?": "Yes, definitely"},
            {"Your Name": "Charlotte Davies","Product Purchased": "FormFlow Business",    "Overall Satisfaction": "4", "Product Quality": "4", "Delivery / Onboarding": "4", "Customer Support": "4", "Value for Money": "4", "NPS — How likely are you to recommend us? (0–10)": "8",  "Would you purchase again?": "Yes, definitely"},
            {"Your Name": "",               "Product Purchased": "FormFlow Enterprise",  "Overall Satisfaction": "3", "Product Quality": "3", "Delivery / Onboarding": "2", "Customer Support": "3", "Value for Money": "3", "NPS — How likely are you to recommend us? (0–10)": "5",  "Would you purchase again?": "Possibly"},
            {"Your Name": "James Wilson",    "Product Purchased": "FormFlow Pro",         "Overall Satisfaction": "5", "Product Quality": "5", "Delivery / Onboarding": "5", "Customer Support": "5", "Value for Money": "4", "NPS — How likely are you to recommend us? (0–10)": "9",  "Would you purchase again?": "Yes, definitely"},
            {"Your Name": "Fatima Khan",     "Product Purchased": "FormFlow API Add-on",  "Overall Satisfaction": "4", "Product Quality": "4", "Delivery / Onboarding": "3", "Customer Support": "4", "Value for Money": "4", "NPS — How likely are you to recommend us? (0–10)": "7",  "Would you purchase again?": "Yes, definitely"},
            {"Your Name": "Yusuf Sheikh",    "Product Purchased": "FormFlow Business",    "Overall Satisfaction": "2", "Product Quality": "3", "Delivery / Onboarding": "2", "Customer Support": "2", "Value for Money": "2", "NPS — How likely are you to recommend us? (0–10)": "3",  "Would you purchase again?": "No"},
        ],
    },

    # 3 ── Internship Application Form (published, 48 responses)
    {
        "title":       "Summer Internship Application 2026",
        "description": "Application form for students applying to the FormFlow summer internship program across engineering, design, and product tracks.",
        "status":      "published",
        "created_days_ago": 60,
        "response_count": 48,
        "response_window": (5, 58),
        "version_history": [
            ("First draft created by HR team — basic fields only", "draft"),
            ("Added academic background section and GPA field", "draft"),
            ("Added portfolio URL field and availability questions", "draft"),
            ("Added consent checkbox and updated eligibility criteria text", "draft"),
            ("Final HR sign-off — published for student applications", "published"),
        ],
        "fields": [
            {"label": "Full Name",             "type": "text",     "required": True,  "placeholder": "As it appears on your student ID"},
            {"label": "Email Address",         "type": "email",    "required": True,  "placeholder": "Your institutional or personal email"},
            {"label": "Phone Number",          "type": "text",     "required": True,  "placeholder": "+91 XXXXX XXXXX"},
            {"label": "University / College",  "type": "text",     "required": True,  "placeholder": "Name of your institution"},
            {"label": "Degree Programme",      "type": "dropdown", "required": True,  "options": ["B.Tech / B.E.", "BCA", "MCA", "M.Tech / M.E.", "MBA", "BBA", "B.Sc (CS/IT)", "Other"]},
            {"label": "Year of Study",         "type": "dropdown", "required": True,  "options": ["1st Year", "2nd Year", "3rd Year", "4th Year", "Postgraduate"]},
            {"label": "Current CGPA / Percentage", "type": "text","required": True,  "placeholder": "e.g. 8.4 / 10 or 84%"},
            {"label": "Preferred Track",       "type": "radio",    "required": True,  "options": ["Software Engineering", "Product Management", "UI/UX Design", "Data Science", "Business Development"]},
            {"label": "Internship Duration",   "type": "radio",    "required": True,  "options": ["2 months", "3 months", "6 months"]},
            {"label": "Available From",        "type": "date",     "required": True},
            {"label": "Why do you want to join FormFlow?", "type": "textarea", "required": True, "placeholder": "Max 300 words"},
            {"label": "Portfolio / GitHub URL","type": "text",     "required": False, "placeholder": "https://"},
            {"label": "Resume Upload",         "type": "file",     "required": True},
            {"label": "I confirm I am currently enrolled", "type": "checkbox", "required": True},
        ],
        "response_samples": [
            {"Full Name": "Ananya Gupta",   "Email Address": "ananya.gupta@rediffmail.com", "Phone Number": "+91 98765 43210", "University / College": "IIT Delhi",            "Degree Programme": "B.Tech / B.E.", "Year of Study": "3rd Year",  "Current CGPA / Percentage": "9.1 / 10", "Preferred Track": "Software Engineering",    "Internship Duration": "3 months", "Why do you want to join FormFlow?": "I am passionate about building scalable web platforms and FormFlow's no-code vision aligns perfectly with my final-year project on dynamic form systems."},
            {"Full Name": "Siddharth Joshi","Email Address": "siddharth.joshi@gmail.com",   "Phone Number": "+91 87654 32109", "University / College": "BITS Pilani",          "Degree Programme": "B.Tech / B.E.", "Year of Study": "2nd Year",  "Current CGPA / Percentage": "8.7 / 10", "Preferred Track": "Data Science",            "Internship Duration": "2 months", "Why do you want to join FormFlow?": "I want to apply my machine learning skills to real-world form analytics and response pattern recognition."},
            {"Full Name": "Kavya Pillai",   "Email Address": "kavya.pillai@yahoo.com",      "Phone Number": "+91 76543 21098", "University / College": "NIT Trichy",           "Degree Programme": "B.Tech / B.E.", "Year of Study": "4th Year",  "Current CGPA / Percentage": "7.9 / 10", "Preferred Track": "UI/UX Design",            "Internship Duration": "3 months", "Why do you want to join FormFlow?": "Designing intuitive form experiences for millions of users is my dream. I have done 3 UX case studies on form usability."},
            {"Full Name": "Rahul Bose",     "Email Address": "rahul.bose@gmail.com",        "Phone Number": "+91 65432 10987", "University / College": "VIT Vellore",          "Degree Programme": "MCA",           "Year of Study": "1st Year",  "Current CGPA / Percentage": "8.2 / 10", "Preferred Track": "Product Management",      "Internship Duration": "6 months", "Why do you want to join FormFlow?": "I have been following FormFlow since its beta. I believe in the product and want to contribute to its roadmap decisions."},
            {"Full Name": "Nisha Tiwari",   "Email Address": "nisha.tiwari@outlook.com",    "Phone Number": "+91 54321 09876", "University / College": "SRM University",       "Degree Programme": "B.Sc (CS/IT)", "Year of Study": "2nd Year",  "Current CGPA / Percentage": "79%",      "Preferred Track": "Business Development",    "Internship Duration": "2 months", "Why do you want to join FormFlow?": "I am eager to explore B2B SaaS sales and help FormFlow grow its enterprise customer base."},
            {"Full Name": "Amit Choudhary", "Email Address": "amit.choudhary@gmail.com",    "Phone Number": "+91 43210 98765", "University / College": "Delhi University",     "Degree Programme": "BCA",           "Year of Study": "3rd Year",  "Current CGPA / Percentage": "72%",      "Preferred Track": "Software Engineering",    "Internship Duration": "3 months", "Why do you want to join FormFlow?": "I have built several React-based projects and would love to contribute to FormFlow's frontend components."},
        ],
    },

    # 4 ── Annual Tech Conference Registration (published, 38 responses)
    {
        "title":       "TechSpark 2026 — Annual Conference Registration",
        "description": "Registration form for the TechSpark 2026 annual technology conference covering AI, cloud, cybersecurity, and product innovation.",
        "status":      "published",
        "created_days_ago": 45,
        "response_count": 38,
        "response_window": (3, 43),
        "version_history": [
            ("Initial event registration form created", "draft"),
            ("Added session preference fields and dietary requirements", "draft"),
            ("Added T-shirt size and early-bird discount code field", "draft"),
            ("Fixed field ordering and improved mobile layout", "draft"),
            ("Conference committee approved — published for registrations", "published"),
        ],
        "fields": [
            {"label": "First Name",            "type": "text",     "required": True},
            {"label": "Last Name",             "type": "text",     "required": True},
            {"label": "Email Address",         "type": "email",    "required": True},
            {"label": "Company / Organisation","type": "text",     "required": True},
            {"label": "Job Title",             "type": "text",     "required": True},
            {"label": "Attendance Type",       "type": "radio",    "required": True,  "options": ["In-Person (Bangalore)", "Virtual (Online Stream)"]},
            {"label": "Track Preference",      "type": "checkbox_group", "required": True, "options": ["Artificial Intelligence & ML", "Cloud & DevOps", "Cybersecurity", "Product & UX", "Web3 & Blockchain", "Startup Ecosystem"]},
            {"label": "T-Shirt Size",          "type": "dropdown", "required": False, "options": ["XS", "S", "M", "L", "XL", "XXL", "Do not need"]},
            {"label": "Dietary Requirements",  "type": "dropdown", "required": False, "options": ["None", "Vegetarian", "Vegan", "Jain", "Gluten-Free", "Halal"]},
            {"label": "Early-Bird Discount Code", "type": "text", "required": False, "placeholder": "TECHSPARK26 for 20% off"},
            {"label": "Any questions or special requests?", "type": "textarea", "required": False},
        ],
        "response_samples": [
            {"First Name": "Pooja",   "Last Name": "Bhatt",    "Email Address": "pooja.bhatt@gmail.com",   "Company / Organisation": "Infosys",       "Job Title": "Senior Software Engineer", "Attendance Type": "In-Person (Bangalore)", "T-Shirt Size": "M",  "Dietary Requirements": "Vegetarian"},
            {"First Name": "Gaurav",  "Last Name": "Yadav",    "Email Address": "gaurav.yadav@hotmail.com","Company / Organisation": "TCS",           "Job Title": "Cloud Architect",          "Attendance Type": "In-Person (Bangalore)", "T-Shirt Size": "L",  "Dietary Requirements": "None"},
            {"First Name": "Ritika",  "Last Name": "Malhotra", "Email Address": "ritika.malhotra@gmail.com","Company / Organisation": "Wipro",        "Job Title": "Product Manager",          "Attendance Type": "Virtual (Online Stream)","T-Shirt Size": "Do not need","Dietary Requirements": "None"},
            {"First Name": "Suresh",  "Last Name": "Babu",     "Email Address": "suresh.babu@protonmail.com","Company / Organisation": "HCL Tech",   "Job Title": "DevOps Lead",              "Attendance Type": "In-Person (Bangalore)", "T-Shirt Size": "XL", "Dietary Requirements": "None"},
            {"First Name": "Lakshmi", "Last Name": "Venkat",   "Email Address": "lakshmi.venkat@yahoo.com","Company / Organisation": "Accenture",   "Job Title": "UX Researcher",            "Attendance Type": "In-Person (Bangalore)", "T-Shirt Size": "S",  "Dietary Requirements": "Vegan"},
        ],
    },

    # 5 ── Campus Placement Registration (draft — in progress)
    {
        "title":       "Campus Placement Registration 2026–27",
        "description": "Registration portal for final-year students to sign up for the 2026–27 campus placement season at partner companies.",
        "status":      "draft",
        "created_days_ago": 25,
        "response_count": 0,
        "response_window": None,
        "version_history": [
            ("Placement cell created initial draft of registration form", "draft"),
            ("Added academic section: CGPA, backlogs, skills", "draft"),
            ("Added company preference and placement eligibility criteria", "draft"),
            ("In review by placement officer — layout adjustments pending", "draft"),
            ("Awaiting final sign-off before publishing to students", "draft"),
        ],
        "fields": [
            {"label": "Student Name",           "type": "text",     "required": True},
            {"label": "Roll Number",            "type": "text",     "required": True},
            {"label": "Branch / Stream",        "type": "dropdown", "required": True,  "options": ["CSE", "ECE", "EEE", "Mechanical", "Civil", "IT", "Data Science", "AI & ML"]},
            {"label": "CGPA (out of 10)",       "type": "text",     "required": True},
            {"label": "Active Backlogs",        "type": "radio",    "required": True,  "options": ["None", "1", "2", "More than 2"]},
            {"label": "Skills (comma-separated)","type": "textarea","required": True},
            {"label": "Preferred Companies",    "type": "textarea", "required": False},
            {"label": "Resume Upload",          "type": "file",     "required": True},
            {"label": "Consent to share data with companies", "type": "checkbox", "required": True},
        ],
        "response_samples": [],
    },

    # 6 ── Product Feature Feedback (archived — had responses)
    {
        "title":       "FormFlow Feature Feedback — Beta Users",
        "description": "Internal beta-user feedback form to collect opinions on the new form builder, conditional logic, and multi-step form features.",
        "status":      "archived",
        "created_days_ago": 120,
        "response_count": 24,
        "response_window": (60, 118),
        "version_history": [
            ("Initial beta feedback form created for internal testers", "draft"),
            ("Added feature-specific rating fields for each new module", "draft"),
            ("Added NPS and feature priority ranking question", "draft"),
            ("Removed duplicate fields, polished descriptions", "draft"),
            ("Published to beta group — archived after beta concluded", "published"),
        ],
        "fields": [
            {"label": "Beta Tester Name",          "type": "text",     "required": True},
            {"label": "Email",                     "type": "email",    "required": True},
            {"label": "Team / Role",               "type": "text",     "required": True},
            {"label": "Form Builder Experience",   "type": "rating",   "required": True,  "max": 5},
            {"label": "Conditional Logic Feature", "type": "rating",   "required": True,  "max": 5},
            {"label": "Multi-Step Forms",          "type": "rating",   "required": True,  "max": 5},
            {"label": "Analytics Dashboard",       "type": "rating",   "required": True,  "max": 5},
            {"label": "Most Valuable Feature",     "type": "radio",    "required": True,  "options": ["Form Builder", "Conditional Logic", "Multi-Step", "Analytics", "Export Options", "Collaboration"]},
            {"label": "Feature you want next",     "type": "textarea", "required": False, "placeholder": "Describe a feature you wish FormFlow had"},
            {"label": "Overall Beta Experience",   "type": "textarea", "required": False},
        ],
        "response_samples": [
            {"Beta Tester Name": "Manish Kapoor",  "Email": "manish.kapoor@gmail.com",   "Team / Role": "Product Engineering",  "Form Builder Experience": "5", "Conditional Logic Feature": "4", "Multi-Step Forms": "4", "Analytics Dashboard": "3", "Most Valuable Feature": "Conditional Logic"},
            {"Beta Tester Name": "Deepa Srinivas", "Email": "deepa.srinivas@outlook.com","Team / Role": "Customer Success",     "Form Builder Experience": "4", "Conditional Logic Feature": "5", "Multi-Step Forms": "5", "Analytics Dashboard": "4", "Most Valuable Feature": "Multi-Step"},
            {"Beta Tester Name": "Nikhil Khanna",  "Email": "nikhil.khanna@gmail.com",   "Team / Role": "Design",               "Form Builder Experience": "5", "Conditional Logic Feature": "4", "Multi-Step Forms": "3", "Analytics Dashboard": "5", "Most Valuable Feature": "Analytics"},
            {"Beta Tester Name": "Ritu Aggarwal",  "Email": "ritu.aggarwal@rediffmail.com","Team / Role": "Backend Engineering","Form Builder Experience": "3", "Conditional Logic Feature": "3", "Multi-Step Forms": "4", "Analytics Dashboard": "4", "Most Valuable Feature": "Export Options"},
        ],
    },
]

# ---------------------------------------------------------------------------
# Audit action helpers
# ---------------------------------------------------------------------------
AUDIT_ACTIONS = {
    "form.created":       ("form", "Form Created"),
    "form.updated":       ("form", "Form Updated"),
    "form.published":     ("form", "Form Published"),
    "form.archived":      ("form", "Form Archived"),
    "form.deleted":       ("form", "Form Deleted"),
    "response.deleted":   ("response", "Response Deleted"),
    "export.generated":   ("export", "Export Downloaded"),
    "share_link.created": ("share_link", "Share Link Created"),
}

# ---------------------------------------------------------------------------
# Main seed function
# ---------------------------------------------------------------------------
def seed(wipe: bool = False):
    db = SessionLocal()

    try:
        if wipe:
            print("🗑️  Wiping existing data …")
            for tbl in [
                "audit_logs", "export_jobs", "share_links",
                "submission_values", "form_submissions",
                "field_options", "validation_rules", "fields",
                "form_versions", "forms", "users",
            ]:
                db.execute(__import__("sqlalchemy").text(f"DELETE FROM {tbl}"))
            db.commit()
            print("   Done.")

        # ── 1. Use Primary User ────────────────────────────────────────────────────
        demo_user = db.query(User).order_by(User.id.asc()).first()
        if not demo_user:
            demo_user = User(
                name="Platform Owner",
                email="admin@formflow.com",
                password_hash=hash_password("Admin123"),
                role=UserRole.ADMIN,
                is_active=True,
                created_at=days_ago(120),
                updated_at=days_ago(1),
                last_login_at=days_ago(0.05),
            )
            db.add(demo_user)
            db.flush()
            print(f"✅ Created admin user: admin@formflow.com")
        else:
            print(f"ℹ️  Using existing primary user ({demo_user.email}) for seeded data.")

        user_id = demo_user.id

        # ── 2. Forms + Versions + Fields ────────────────────────────────────
        created_forms = []   # list of (form_obj, form_def, published_version_id, field_map)

        for fdef in FORM_DEFINITIONS:
            # Check if this form already exists for this user
            existing = db.query(Form).filter_by(user_id=user_id, title=fdef["title"]).first()
            if existing:
                print(f"ℹ️  Form '{fdef['title']}' already exists — skipping.")
                continue

            created_at = days_ago(fdef["created_days_ago"])
            updated_at = rand_dt(2, min(15, fdef["created_days_ago"] - 1))

            form = Form(
                title=fdef["title"],
                description=fdef["description"],
                user_id=user_id,
                status=fdef["status"],
                is_deleted=False,
                created_by=user_id,
                updated_by=user_id,
                created_at=created_at,
                updated_at=updated_at,
            )
            db.add(form)
            db.flush()

            # Fields
            field_map = {}   # label → Field object
            for idx, fld in enumerate(fdef.get("fields", [])):
                field = Field(
                    form_id=form.id,
                    label=fld["label"],
                    field_type=fld["type"],
                    required=fld.get("required", False),
                    placeholder=fld.get("placeholder"),
                    help_text=fld.get("help_text"),
                    display_order=idx,
                )
                db.add(field)
                db.flush()
                field_map[fld["label"]] = field

                # Options for dropdown/radio/checkbox_group
                for opt_idx, opt in enumerate(fld.get("options", [])):
                    db.add(FieldOption(
                        field_id=field.id,
                        option_label=opt,
                        option_value=opt.lower().replace(" ", "_"),
                        display_order=opt_idx,
                    ))

                # Validation rules
                if fld["type"] == "email":
                    db.add(ValidationRule(field_id=field.id, rule_type="email_format", error_message="Please enter a valid email address"))
                if fld["type"] == "rating" and fld.get("max"):
                    db.add(ValidationRule(field_id=field.id, rule_type="max_value", rule_value=str(fld["max"]), error_message=f"Rating must be between 1 and {fld['max']}"))
                if fld.get("required"):
                    db.add(ValidationRule(field_id=field.id, rule_type="required", error_message=f"{fld['label']} is required"))

            db.flush()

            # Snapshot for versions
            snapshot_fields = [
                {
                    "id": field_map[fld["label"]].id,
                    "label": fld["label"],
                    "field_type": fld["type"],
                    "required": fld.get("required", False),
                    "placeholder": fld.get("placeholder"),
                    "options": fld.get("options", []),
                }
                for fld in fdef.get("fields", [])
            ]

            # 5 Versions
            version_window = fdef["created_days_ago"]
            pub_version_id = None
            for v_num, (summary, vstatus) in enumerate(fdef["version_history"], 1):
                v_created = days_ago(version_window - (v_num - 1) * (version_window / 6))
                ver = FormVersion(
                    form_id=form.id,
                    version_number=v_num,
                    status=vstatus,
                    created_at=v_created,
                    snapshot={
                        "fields": snapshot_fields,
                        "title": fdef["title"],
                        "description": fdef["description"],
                        "version": v_num,
                        "change_summary": summary,
                        "created_by": user_id,
                        "fingerprint": rand_fingerprint(),
                    },
                )
                db.add(ver)
                db.flush()
                if vstatus == "published":
                    pub_version_id = ver.id

            # Share link for published forms
            share_link = None
            if fdef["status"] in ("published",) and pub_version_id:
                share_link = ShareLink(
                    form_id=form.id,
                    form_version_id=pub_version_id,
                    link_token=rand_token(),
                    is_active=True,
                    created_at=rand_dt(fdef["created_days_ago"] - 2, fdef["created_days_ago"] - 15),
                )
                db.add(share_link)

            created_forms.append((form, fdef, pub_version_id, field_map))
            print(f"   ✅ Created form: {fdef['title']} [{fdef['status']}]")

        db.flush()

        # ── 3. Responses ────────────────────────────────────────────────────
        for form, fdef, pub_version_id, field_map in created_forms:
            n_responses = fdef["response_count"]
            if n_responses == 0 or not pub_version_id or fdef["response_window"] is None:
                continue

            start_d, end_d = fdef["response_window"]
            samples = fdef.get("response_samples", [])

            for i in range(n_responses):
                submitted_at = rand_dt(start_d, end_d)
                start_secs = random.randint(45, 600)
                started_at = submitted_at - timedelta(seconds=start_secs)

                # Pick a respondent
                respondent_name, respondent_email = random.choice(RESPONDENTS)

                submission = FormSubmission(
                    form_id=form.id,
                    form_version_id=pub_version_id,
                    started_at=started_at,
                    submitted_at=submitted_at,
                    submitter_ip=rand_ip(),
                    idempotency_key=secrets.token_hex(16),
                    is_archived=False,
                )
                db.add(submission)
                db.flush()

                # Values — cycle through samples, fill remaining randomly
                sample_data = {}
                if samples:
                    sample = samples[i % len(samples)]
                    sample_data = dict(sample)

                for label, field in field_map.items():
                    val = sample_data.get(label)

                    # Synthesize realistic values if not in sample
                    if val is None:
                        ft = field.field_type
                        if ft == "text":
                            if "name" in label.lower():
                                val = respondent_name
                            elif "email" in label.lower():
                                val = respondent_email
                            elif "phone" in label.lower():
                                val = f"+91 {random.randint(70000,99999):05d} {random.randint(10000,99999):05d}"
                            elif "cgpa" in label.lower() or "gpa" in label.lower():
                                val = f"{random.uniform(6.5, 9.8):.1f} / 10"
                            elif "nps" in label.lower() or "0–10" in label.lower() or "0-10" in label.lower():
                                val = str(random.randint(0, 10))
                            elif "url" in label.lower() or "github" in label.lower() or "portfolio" in label.lower():
                                val = random.choice(["https://github.com/user", "https://portfolio.dev/user", "", ""])
                            elif "roll" in label.lower():
                                val = f"20{random.randint(10,26)}{random.randint(10000,99999)}"
                            elif "company" in label.lower() or "organisation" in label.lower():
                                val = random.choice(["TCS", "Infosys", "Wipro", "HCL", "Accenture", "Cognizant", "Capgemini", "IBM", "Microsoft", "Google", "Razorpay", "Zomato", "Swiggy", "Flipkart"])
                            elif "discount" in label.lower():
                                val = random.choice(["TECHSPARK26", "", "", "", "EARLY2026", ""])
                            else:
                                val = respondent_name
                        elif ft == "email":
                            val = respondent_email
                        elif ft == "rating":
                            val = str(random.choices([1,2,3,4,5], weights=[3,5,10,35,47])[0])
                        elif ft == "dropdown":
                            opts = [o.option_label for o in field.options]
                            val = random.choice(opts) if opts else ""
                        elif ft == "radio":
                            opts = [o.option_label for o in field.options]
                            val = random.choice(opts) if opts else ""
                        elif ft == "checkbox_group":
                            opts = [o.option_label for o in field.options]
                            chosen = random.sample(opts, random.randint(1, min(3, len(opts))))
                            val = json.dumps(chosen)
                        elif ft == "checkbox":
                            val = "true"
                        elif ft == "textarea":
                            val = random.choice([
                                "The team culture and collaboration are excellent.",
                                "I appreciate the learning opportunities provided.",
                                "Communication could be improved across departments.",
                                "The onboarding process was smooth and well-organized.",
                                "Would appreciate more cross-functional project exposure.",
                                "Great work environment with supportive colleagues.",
                                "The product roadmap is exciting and well-communicated.",
                                "Remote work flexibility is a huge plus.",
                                "More mentorship programmes would be beneficial.",
                                "Excellent platform — easy to build and deploy forms quickly.",
                            ])
                        elif ft == "date":
                            val = (NOW + timedelta(days=random.randint(14, 60))).strftime("%Y-%m-%d")
                        elif ft == "file":
                            val = json.dumps({"stored_name": f"resume_{respondent_name.replace(' ','_').lower()}.pdf", "name": f"{respondent_name} - Resume.pdf", "size": random.randint(150000, 850000), "type": "application/pdf"})
                        else:
                            val = ""

                    db.add(SubmissionValue(
                        submission_id=submission.id,
                        field_id=field.id,
                        value=str(val) if val is not None else None,
                    ))

            print(f"   📋 Added {n_responses} responses for '{form.title}'")

        db.flush()

        # ── 4. Export Jobs ───────────────────────────────────────────────────
        published_forms = [(f, fd, pvid) for f, fd, pvid, _ in created_forms if fd["status"] in ("published", "archived") and pvid]

        export_records = [
            ("csv",   30, 2.4),
            ("excel", 28, 3.1),
            ("csv",   22, 1.8),
            ("pdf",   18, 5.6),
            ("csv",   15, 2.1),
            ("excel", 10, 3.8),
            ("csv",    6, 1.5),
            ("pdf",    3, 4.2),
        ]
        for fmt, days_back, size_mb in export_records:
            if not published_forms:
                break
            form_obj, _, _ = random.choice(published_forms)
            created = days_ago(days_back) + timedelta(seconds=random.randint(0, 3600))
            db.add(ExportJob(
                form_id=form_obj.id,
                user_id=user_id,
                format=fmt,
                status="completed",
                file_url=f"/exports/{form_obj.id}/{fmt}/{rand_token()}.{fmt if fmt != 'excel' else 'xlsx'}",
                created_at=created,
                completed_at=created + timedelta(seconds=random.randint(2, 30)),
            ))

        print(f"   📦 Added {len(export_records)} export job records")

        # ── 5. Audit Logs ────────────────────────────────────────────────────
        audit_entries = []

        for form, fdef, pub_version_id, _ in created_forms:
            created_at = form.created_at

            audit_entries.append(AuditLog(
                user_id=user_id, action="form.created", entity_type="form", entity_id=form.id,
                details={"title": form.title, "status": "draft"},
                created_at=created_at,
            ))

            # Version-by-version updates
            for v_num in range(2, 6):
                v_offset = fdef["created_days_ago"] - v_num * (fdef["created_days_ago"] / 6)
                audit_entries.append(AuditLog(
                    user_id=user_id, action="form.updated", entity_type="form", entity_id=form.id,
                    details={"version": v_num, "summary": fdef["version_history"][v_num-1][0]},
                    created_at=days_ago(max(1, v_offset)),
                ))

            if fdef["status"] == "published" and pub_version_id:
                audit_entries.append(AuditLog(
                    user_id=user_id, action="form.published", entity_type="form", entity_id=form.id,
                    details={"version_id": pub_version_id, "title": form.title},
                    created_at=form.updated_at,
                ))
                audit_entries.append(AuditLog(
                    user_id=user_id, action="share_link.created", entity_type="share_link", entity_id=form.id,
                    details={"form_id": form.id},
                    created_at=form.updated_at + timedelta(minutes=random.randint(5, 60)),
                ))

            if fdef["status"] == "archived":
                audit_entries.append(AuditLog(
                    user_id=user_id, action="form.archived", entity_type="form", entity_id=form.id,
                    details={"reason": "Beta phase concluded"},
                    created_at=days_ago(random.uniform(45, 60)),
                ))

        # Export downloads
        for fmt, days_back, _ in export_records[:5]:
            if published_forms:
                form_obj, _, _ = random.choice(published_forms)
                audit_entries.append(AuditLog(
                    user_id=user_id, action="export.generated", entity_type="export", entity_id=form_obj.id,
                    details={"format": fmt, "form_title": form_obj.title},
                    created_at=days_ago(days_back),
                ))

        # Misc: response deletions, retention policy change
        if published_forms:
            form_obj, _, _ = published_forms[0]
            audit_entries.append(AuditLog(
                user_id=user_id, action="response.deleted", entity_type="response", entity_id=None,
                details={"form_id": form_obj.id, "reason": "Respondent requested deletion"},
                created_at=days_ago(12),
            ))
        audit_entries.append(AuditLog(
            user_id=user_id, action="form.updated", entity_type="settings", entity_id=None,
            details={"setting": "retention_policy", "value": "90_days"},
            created_at=days_ago(20),
        ))

        for entry in audit_entries:
            db.add(entry)

        print(f"   📝 Added {len(audit_entries)} audit log entries")

        db.commit()
        print("\n🎉 Seed complete! The application now has rich, realistic demo data.")
        print(f"   Login: {DEMO_EMAIL}  |  Password: Demo@2026")

    except Exception as exc:
        db.rollback()
        print(f"\n❌ Error during seeding: {exc}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed FormFlow with professional demo data")
    parser.add_argument("--wipe", action="store_true", help="Delete all existing data before seeding")
    args = parser.parse_args()
    seed(wipe=args.wipe)
