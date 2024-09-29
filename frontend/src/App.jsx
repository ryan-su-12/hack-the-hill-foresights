import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [days, setDays] = useState({});
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [isCoachPopupVisible, setIsCoachPopupVisible] = useState(false);

  const [clubData, setClubData] = useState({
    speed: 0, // Club Head Speed in m/s
    launch_angle: 0, // Launch Angle in degrees
  });

  const [videoSrc, setVideoSrc] = useState(''); // Store the video feed
  const videoRef = useRef(null); // Reference for the video feed

  const getDateString = (date) => date.toISOString().split('T')[0];

  const getLast7Days = () => {
    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      last7Days.push(date);
    }
    return last7Days;
  };

  const togglePopup = () => setIsPopupVisible(!isPopupVisible);

  const toggleCoachPopup = () => setIsCoachPopupVisible(!isCoachPopupVisible);

  useEffect(() => {
    const storedDays = JSON.parse(localStorage.getItem('streakDays')) || {};
    setDays(storedDays);
  }, []);

  const markDayAsComplete = () => {
    const todayString = getDateString(new Date());
    const updatedDays = { ...days, [todayString]: 'completed' };
    setDays(updatedDays);
    localStorage.setItem('streakDays', JSON.stringify(updatedDays));
  };

  const getDayStatus = (dateString) => {
    const todayString = getDateString(new Date());
    if (dateString === todayString) {
      return days[dateString] === 'completed' ? 'completed' : 'active';
    } else {
      return days[dateString] === 'completed' ? 'completed' : 'inactive';
    }
  };

  const getStreakCount = () => {
    let streak = 0;
    let today = new Date();
    let dateString = getDateString(today);
    while (days[dateString] === 'completed') {
      streak++;
      today.setDate(today.getDate() - 1);
      dateString = getDateString(today);
    }
    return streak;
  };

  // Calculate Projected Ball Speed (Ball Speed = Club Head Speed / 1.5)
  const calculateProjectedBallSpeed = (clubHeadSpeed) => {
    return (clubHeadSpeed / 1.5).toFixed(2); // Ball speed in m/s
  };

  // Calculate Carry Distance using simplified projectile motion formula
  const calculateProjectedDistance = (clubHeadSpeed, launchAngle) => {
    const g = 9.81; // Gravity in m/s²
    const carryDistance = (Math.pow(clubHeadSpeed, 2) / g) * Math.sin(2 * (launchAngle * (Math.PI / 180)));
    const carryDistanceInYards = carryDistance * 1.09361; // Convert meters to yards
    return carryDistanceInYards.toFixed(2); // Distance in yards
  };

  useEffect(() => {
    const fetchClubData = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/club-face');
        
        setClubData(prevData => ({
          speed: response.data.speed !== undefined ? response.data.speed : prevData.speed, // Club Head Speed in m/s
          launch_angle: response.data.launch_angle !== undefined ? response.data.launch_angle : prevData.launch_angle, // Launch Angle in degrees
        }));

        console.log("Updated Club Data:", {
          speed: response.data.speed,
          launch_angle: response.data.launch_angle,
        });
      } catch (error) {
        console.error('Error fetching club data', error);
      }
    };

    const interval = setInterval(() => {
      fetchClubData();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // WebSocket connection to receive video feed
  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/video');
    
    ws.onmessage = (event) => {
      setVideoSrc(`data:image/jpeg;base64,${event.data}`);
    };

    return () => ws.close();
  }, []);

  const projectedBallSpeed = calculateProjectedBallSpeed(clubData.speed);
  const projectedDistance = calculateProjectedDistance(clubData.speed, clubData.launch_angle);

  return (
    <div className="container">
      <div id="home"></div>
      <nav>
        <a className="foresights" href="https://foresights.ca" target="_blank" rel="noreferrer">
          <img src="/favicon.png" alt="foresights logo" />
        </a>
        <ul className="nav-links">
          {getLast7Days().map((date) => {
            const dateString = getDateString(date);
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
            const dayStatus = getDayStatus(dateString);

            return (
              <li key={dateString}>
                <span className="day-label">{dayLabel}</span>
                <div className={`day-icon ${dayStatus}`}>
                  {dayStatus === 'completed' ? (
                    <span className="checkmark">
                      <i className="fas fa-check"></i>
                    </span>
                  ) : (
                    <span className="crossmark">
                      <i className="fas fa-times"></i>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="streak-icon-container">
          <img src="/flame.png" alt="streak icon" className="streak-icon" />
          <p className="streak-count">{getStreakCount()}</p>
        </div>
      </nav>

      <div className="content-box">
        <div className="content">
          {/* Stat boxes */}
          <div className="stats">
            <div className="stat-box">
              <h3>Club Head Speed</h3> {/* Club Head Speed */}
              <p>{clubData.speed ? `${clubData.speed.toFixed(2)} m/s` : 'No data'}</p> {/* Display Club Head Speed */}
            </div>
            <div className="stat-box">
              <h3>Launch Angle</h3> {/* Launch Angle */}
              <p>{clubData.launch_angle ? `${clubData.launch_angle.toFixed(2)}°` : 'No data'}</p> {/* Display Launch Angle */}
            </div>
            <div className="stat-box">
              <h3>Projected Ball Speed</h3> {/* Projected Ball Speed */}
              <p>{projectedBallSpeed ? `${projectedBallSpeed} m/s` : 'No data'}</p> {/* Display Projected Ball Speed */}
            </div>
            <div className="stat-box">
              <h3>Projected Distance</h3> {/* Projected Distance */}
              <p>{projectedDistance ? `${projectedDistance} yards` : 'No data'}</p> {/* Display Projected Distance */}
            </div>
          </div>
          <div className="image-placeholder">
            {/* Render the video feed */}
            {videoSrc && <img ref={videoRef} src={videoSrc} alt="RealSense Video Feed" />}
          </div>
        </div>
      </div>

      <div className="btn-container">
        <a
          href="https://foresights.ca/simulator"
          className="btn btn-more"
          target="_blank"
          rel="noreferrer"
          onClick={markDayAsComplete}
        >
          Launch Simulator<i className="fas fa-chevron-right"></i>
        </a>
      </div>

      {isPopupVisible && (
        <div className="popup visible authors-popup">
          <h3>Authors</h3>
          <hr />
          <a href="https://www.linkedin.com/in/isaiahiruoha/" target="_blank" rel="noreferrer">
            Isaiah Iruoha
          </a>
          <a href="https://www.linkedin.com/in/connorleung/" target="_blank" rel="noreferrer">
            Connor Leung
          </a>
          <a href="https://www.linkedin.com/in/ryan-z-su/" target="_blank" rel="noreferrer">
            Ryan Su
          </a>
        </div>
      )}
      <div className="icon-background" onClick={togglePopup}>
        <svg className={`authors ${isPopupVisible ? 'rotate' : ''}`} fill="#000000" height="800px" width="800px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" 
        viewBox="0 0 964.07 964.07" xmlSpace="preserve">
          <g>
            <path d="M850.662,877.56c-0.77,0.137-4.372,0.782-10.226,1.831c-230.868,41.379-273.337,48.484-278.103,49.037
              c-11.37,1.319-19.864,0.651-25.976-2.042c-3.818-1.682-5.886-3.724-6.438-4.623c0.268-1.597,2.299-5.405,3.539-7.73
              c1.207-2.263,2.574-4.826,3.772-7.558c7.945-18.13,2.386-36.521-14.51-47.999c-12.599-8.557-29.304-12.03-49.666-10.325
              c-12.155,1.019-225.218,36.738-342.253,56.437l-57.445,45.175c133.968-22.612,389.193-65.433,402.622-66.735
              c11.996-1.007,21.355,0.517,27.074,4.4c3.321,2.257,2.994,3.003,2.12,4.997c-0.656,1.497-1.599,3.264-2.596,5.135
              c-3.835,7.189-9.087,17.034-7.348,29.229c1.907,13.374,11.753,24.901,27.014,31.626c8.58,3.78,18.427,5.654,29.846,5.654
              c4.508,0,9.261-0.292,14.276-0.874c9.183-1.065,103.471-17.67,280.244-49.354c5.821-1.043,9.403-1.686,10.169-1.821
              c9.516-1.688,15.861-10.772,14.172-20.289S860.183,875.87,850.662,877.56z"/>
            <path d="M231.14,707.501L82.479,863.005c-16.373,17.127-27.906,38.294-33.419,61.338l211.087-166.001
              c66.081,29.303,118.866,38.637,159.32,38.637c71.073,0,104.065-28.826,104.065-28.826c-66.164-34.43-75.592-98.686-75.592-98.686
              c50.675,21.424,156.235,46.678,156.235,46.678c140.186-93.563,213.45-296.138,213.45-296.138
              c-14.515,3.99-28.395,5.652-41.475,5.652c-65.795,0-111-42.13-111-42.13l183.144-39.885C909.186,218.71,915.01,0,915.01,0
              L358.176,495.258C295.116,551.344,250.776,625.424,231.14,707.501z"/>
          </g>
        </svg>
      </div>
      <div className="coach-container" onClick={toggleCoachPopup}>
        <img src="coach.png" alt="Coach" className="coach-image" />
  
        <i className={`fas fa-lightbulb coach-lightbulb ${isCoachPopupVisible ? 'hidden' : ''}`}></i>
        
        {isCoachPopupVisible && (
          <div className="popup coach-popup visible">
            <h3>Professor Par</h3>
            <hr />
            <p>"Consistency is key—every swing builds your mastery. Focus on your form today, and tomorrow's power will follow!"</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
