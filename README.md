TravelSync is a full-stack web application designed to simplify group travel planning and expense management. Create trips, invite members, track shared expenses, and automatically calculate fair cost splits—all in one centralized platform.

✨ Features
🔐 User Authentication & Profile Management

Secure user registration and login with JWT-based authentication
Password encryption using bcrypt
User profile management (name, photo, travel preferences)
Protected routes with role-based access control

🧭 Trip Creation & Management

Create trips with destination, dates, description, and estimated budget
Browse all public trips created by other users
Trip owner controls: accept/reject join requests
Automatic membership for trip creators
View all confirmed members of each trip

🤝 Group Collaboration

Send join requests to existing trips
Trip owner review and approval system
Real-time member list updates
Transparent trip details for all members

💰 Expense Tracking & Cost Splitting ⭐ Core Feature

Add expenses with amount, category (travel, food, stay, activities, etc.), and payer
Automatic equal distribution of expenses among all trip members
Real-time calculation of total trip expenses
Individual contribution tracking (who paid what)
Clear visibility of who owes whom
Complete expense history for each trip

📊 Expense Reports & Insights

Trip summary dashboard with total spend
Per-person share calculation
Member-wise expense breakdown
Balance status for settlements
Transparent reporting eliminates manual calculations

🎨 Modern UI/UX Design

Clean, minimal, and intuitive dashboard
Responsive design (mobile, tablet, desktop)
Card-based layouts for easy readability
Smooth user interactions
Clear error handling and validation messages

🛠️ Technologies Used
Frontend

React.js - Component-based UI library
HTML5 & CSS3 - Markup and styling
Tailwind CSS - Utility-first CSS framework
Axios - HTTP client for API requests
React Router - Client-side routing

Backend

Node.js - JavaScript runtime environment
Express.js - Web application framework
JSON Web Tokens (JWT) - Secure authentication
bcrypt - Password hashing

Development Tools

VS Code
Postman (API testing)
Git & GitHub

💻 Usage
1. Register/Login

Create a new account or login with existing credentials
Set up your profile with travel preferences

2. Create or Join Trips

Create a Trip: Add destination, dates, description, and budget
Browse Trips: Discover public trips and send join requests
Accept Members: Trip owners approve/reject join requests

3. Track Expenses

Add expenses with amount, category, and who paid
View real-time expense splits
Check individual balances
Generate settlement reports

4. Manage Trip

View all trip members
Track expense history
See total trip costs
Monitor per-person shares

