# CodeAlpha_SocialMediaPlatform

This project implements a basic social media platform using React for the frontend and Node.js/Express with MongoDB for the backend.

## Features

- **User Authentication**: Users can register and log in.
- **Posting**: Authenticated users can create posts with text and images.
- **Post Interaction**: Users can like and comment on posts.
- **Following**: Users can follow and unfollow other users.
- **News Feed**: A personalized feed showing posts from followed users.
- **Profile Page**: A page to view a user's profile and their posts.

## Tech Stack

### Frontend
- [React](https://reactjs.org/) - UI library
- [Redux Toolkit](https://redux-toolkit.js.org/) - State management
- [Axios](https://axios-http.com/) - HTTP client
- [Material-UI](https://mui.com/) - UI components

### Backend
- [Node.js](https://nodejs.org/) - Runtime
- [Express.js](https://expressjs.com/) - Web framework
- [MongoDB](https://www.mongodb.com/) - Database
- [JWT (jsonwebtoken)](https://www.npmjs.com/package/jsonwebtoken) - Authentication
- [Bcrypt (bcryptjs)](https://www.npmjs.com/package/bcryptjs) - Password hashing
- [Multer](https://www.npmjs.com/package/multer) - File uploads

## Project Structure

```
CodeAlpha_SocialMediaPlatform/
├── public/                 # Static files (HTML, etc.)
├── src/                    # React application
│   ├── components/         # Reusable React components
│   ├── pages/              # Page components
│   ├── redux/              # Redux store configuration
│   ├── services/           # API service layer
│   ├── App.css             # Global styles
│   ├── index.css           # Main CSS
│   └── index.js            # Entry point
├── uploads/                # Uploaded images
├── server.js               # Express server entry point
├── package.json            # Project dependencies
└── README.md               # Project documentation
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (running locally or a connection string)

## Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd CodeAlpha_SocialMediaPlatform
   ```

2. **Install backend dependencies**:
   ```bash
   cd .. # Navigate to the root directory if needed
   cd CodeAlpha_SocialMediaPlatform
   npm install
   ```

3. **Install frontend dependencies**:
   ```bash
   cd client
   npm install
   ```

## Configuration

Create a `.env` file in the `CodeAlpha_SocialMediaPlatform` directory (server root) with the following variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

- `MONGO_URI`: Your MongoDB connection string (e.g., `mongodb://localhost:27017/socialmedia`)
- `JWT_SECRET`: A secret key for signing JWT tokens

## Usage

### Start the Backend Server
```bash
cd CodeAlpha_SocialMediaPlatform
npm start
```
The server will start on `http://localhost:5000`.

### Start the Frontend
```bash
cd client
npm start
```
The React app will start on `http://localhost:3000`.

## Usage

1. Navigate to the client directory: `cd client`
2. Install dependencies: `npm install`
3. Start the development server: `npm start`
The application will be available at `http://localhost:3000`.

## Deployment

### Backend
```bash
cd CodeAlpha_SocialMediaPlatform
npm start
```

### Frontend
```bash
cd client
npm run build
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)

## Contact

Sudheer Kalluri - [GitHub](https://github.com/sudheerkalluri245-del)
