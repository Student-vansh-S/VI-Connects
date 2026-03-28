import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import GuestJoin from './pages/GuestJoin';
import Layout from './components/Layout';

function App() {
  return (
    <div className="App">
      <Router>
        <AuthProvider>
          <Routes>
            <Route path='/' element={<Layout><LandingPage /></Layout>} />
            <Route path='/auth' element={<Layout><Authentication /></Layout>} />
            <Route path='/home' element={<Layout><HomeComponent /></Layout>} />
            <Route path='/history' element={<Layout><History /></Layout>} />
            <Route path='/guest-join' element={<Layout><GuestJoin /></Layout>} />
            <Route path='/meeting/:meetingCode' element={<VideoMeetComponent />} />
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;