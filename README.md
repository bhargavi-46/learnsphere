# LearnSphere - Online Course Platform

LearnSphere is a full-stack web application built with Node.js, Express, MongoDB, and EJS, designed as a platform for uploading, selling, and viewing online courses. It features secure user authentication, course management for administrators, payment integration with Razorpay, and secure video streaming via Azure Blob Storage.

## Features

**Admin Features:**

*   Secure Admin Login
*   Admin Dashboard Overview
*   **Course Management:**
    *   Upload New Courses (Title, Description, Price, Thumbnail Image, Video File)
    *   List Existing Courses
    *   Edit Existing Course Details (including optional file replacement)
    *   Delete Courses (removes course data and associated files from Azure)
*   View Enrollments per Course

**User Features:**

*   User Signup & Login
*   Browse All Available Courses
*   Search Courses by Title/Description
*   View Detailed Course Information Page
*   **Enrollment:**
    *   Enroll in Free Courses directly
    *   Purchase Paid Courses via Razorpay integration
*   "My Courses" Page: View all enrolled courses
*   User Dashboard: Overview of recent enrollments/activity
*   **Secure Video Streaming:** Watch enrolled course videos streamed securely using temporary Azure SAS URLs.

## Technology Stack

*   **Backend:** Node.js, Express.js
*   **Database:** MongoDB with Mongoose ODM
*   **Frontend Templating:** EJS (Embedded JavaScript Templates)
*   **Styling:** CSS3 (style.css)
*   **File Storage:** Microsoft Azure Blob Storage
*   **Payments:** Razorpay API
*   **Authentication:** express-session, connect-mongo, bcryptjs (for password hashing)
*   **File Uploads:** Multer
*   **Environment Variables:** dotenv

## Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/) (which includes npm)
*   [MongoDB](https://www.mongodb.com/try/download/community) (or a connection string to a MongoDB Atlas cluster)
*   [Git](https://git-scm.com/) (optional, for cloning)
*   An [Azure Account](https://azure.microsoft.com/) with an active subscription and a Blob Storage Account created.
*   A [Razorpay Account](https://razorpay.com/) (Test Mode keys are sufficient for development).
*   [ngrok](https://ngrok.com/download) (for testing Razorpay webhooks locally).

## Setup and Installation

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/bhargavi-46/learnsphere.git
    cd learnsphere-project # Or your project directory name
    ```
  

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Create Environment File (`.env`):**
    *   Create a file named `.env` in the root directory of the project.
    *   Add the necessary environment variables as listed in the "Environment Variables" section below. **This file stores sensitive keys and should NOT be committed to Git.**

4.  **Configure Environment Variables:**
    *   Fill in the required values in your `.env` file. See the list of required variables below.
    *   **Crucially, generate your own unique `RAZORPAY_WEBHOOK_SECRET` and set it both here and in the Razorpay dashboard.**

5.  **Configure Azure:**
    *   Log in to your Azure portal.
    *   Navigate to your Storage Account.
    *   Go to "Containers" and create a new container (e.g., `coursevideos`). Note the name for your `.env` file (`AZURE_STORAGE_CONTAINER_NAME`).
    *   Find your Storage Account "Access keys" and copy one of the **Connection strings**. This is the value for `AZURE_STORAGE_CONNECTION_STRING` in your `.env` file.

6.  **Configure Razorpay:**
    *   Log in to your Razorpay Test Dashboard.
    *   Go to Settings -> API Keys and copy your `Key ID` and `Key Secret`. These are the values for `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in your `.env` file.
    *   Go to Settings -> Webhooks.
    *   Click "+ Add New Webhook".
    *   For the **Webhook URL**, you will need to use `ngrok` (see "Running the Application"). The URL will be like `YOUR_NGROK_URL/payment/webhook`.
    *   Enter the **Secret** you created and put in your `.env` file (`RAZORPAY_WEBHOOK_SECRET`).
    *   Under "Active Events", make sure `payment.captured` is selected.
    *   Save the webhook.

## Environment Variables (`.env` File Required)

Create a `.env` file in the project root and define the following variables with your specific values:

*   `MONGO_URI`: Your MongoDB connection string (e.g., `mongodb://localhost:27017/learnsphere` or Atlas string).
*   `SESSION_SECRET`: A long, random, secret string used for securing user sessions.
*   `AZURE_STORAGE_CONNECTION_STRING`: The connection string for your Azure Blob Storage account.
*   `AZURE_STORAGE_CONTAINER_NAME`: The name of the container you created in Azure (e.g., `coursevideos`).
*   `RAZORPAY_KEY_ID`: Your Razorpay Test Key ID.
*   `RAZORPAY_KEY_SECRET`: Your Razorpay Test Key Secret.
*   `RAZORPAY_WEBHOOK_SECRET`: A strong, unique secret **that you create**. Must match the secret entered in the Razorpay webhook settings.
*   `PORT` (Optional): The port the server should run on (defaults to 3000 if not set).

*(Remember to keep the `.env` file secure and add it to your `.gitignore` file.)*

## Running the Application

1.  **Start the Server:**
    *   For development with automatic restarting (requires `nodemon` installed globally or as a dev dependency):
        ```bash
        npm run dev
        ```
    *   For standard start:
        ```bash
        npm start
        ```
        *(This usually runs `node server.js`)*
    *   The server should now be running on `http://localhost:3000` (or the port specified in `.env`).

2.  **Start ngrok (for Webhooks during local development):**
    *   Open a *new, separate* terminal window.
    *   Run the following command (replace `3000` if your server uses a different port):
        ```bash
        ngrok http 3000
        ```
    *   Ngrok will display a "Forwarding" URL (e.g., `https://abcdef12345.ngrok-free.app`). Note this URL.
    *   Go back to your Razorpay Webhook settings and update the **Webhook URL** to be `YOUR_NGROK_FORWARDING_URL/payment/webhook` (e.g., `https://abcdef12345.ngrok-free.app/payment/webhook`).
    *   **Note:** The free ngrok URL is temporary and changes every time you restart ngrok. You must update the Razorpay webhook settings each time during development.



## Project Structure
course-platform/
├── config/ # Connection settings (DB, Azure, Razorpay)
│ ├── db.js
│ ├── azure.js
│ └── razorpay.js
├── controllers/ # Core application logic for handling requests
│ ├── authController.js
│ ├── courseController.js
│ ├── paymentController.js
│ └── adminController.js
├── middleware/ # Request processing checkpoints (Auth, File Uploads)
│ ├── authMiddleware.js
│ └── uploadMiddleware.js
├── models/ # Mongoose schemas (Data blueprints for MongoDB)
│ ├── User.js
│ ├── Course.js
│ └── Enrollment.js
├── public/ # Static files served directly to the browser
│ ├── css/
│ ├── js/
│ └── img/
├── routes/ # Defines URL paths and maps them to controllers
│ ├── authRoutes.js
│ ├── courseRoutes.js
│ ├── paymentRoutes.js
│ ├── adminRoutes.js
│ ├── indexRoutes.js # Home page route
│ └── userRoutes.js # User dashboard route
├── views/ # EJS templates for generating HTML
│ ├── partials/ # Reusable EJS snippets (header, footer, navbar)
│ ├── auth/
│ ├── courses/
│ ├── user/
│ ├── admin/
│ ├── index.ejs # Home page template
│ └── error.ejs # Generic error page template
├── .env # Environment variables (KEEP SECRET - Add to .gitignore)
├── .gitignore # Files/folders ignored by Git (node_modules, .env)
├── package.json # Project metadata and dependencies
├── package-lock.json # Exact dependency versions
└── server.js # Main application entry point
