import React, { useState } from 'react';
import './App.css'; 

function App() {
  const [domainCount, setDomainCount] = useState('');
  const [domains, setDomains] = useState([]);
  const [userCounts, setUserCounts] = useState([]);
  const [users, setUsers] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [totalTargetVolume, setTotalTargetVolume] = useState('');
  const [step, setStep] = useState(1);
  const [rampUpPlan, setRampUpPlan] = useState([]);
  
  const handleDomainCountChange = (e) => {
    setDomainCount(e.target.value);
  };

  const handleDomainChange = (index, value) => {
    const newDomains = [...domains];
    newDomains[index] = value;
    setDomains(newDomains);
  };

  const handleUserCountChange = (index, value) => {
    const newUserCounts = [...userCounts];
    newUserCounts[index] = value;
    setUserCounts(newUserCounts);

    const newUsers = [...users];
    newUsers[index] = Array.from({ length: Number(value) }, () => ({ name: '', volume: 0 }));
    setUsers(newUsers);
  };

  const handleUserNameChange = (domainIndex, userIndex, value) => {
    const newUsers = users.map((userList, index) => {
      if (index === domainIndex) {
        const updatedUserList = [...userList];
        updatedUserList[userIndex] = { ...updatedUserList[userIndex], name: value };
        return updatedUserList;
      }
      return userList;
    });
    setUsers(newUsers);
  };

  const handleUserVolumeChange = (domainIndex, userIndex, value) => {
    const newUsers = users.map((userList, index) => {
      if (index === domainIndex) {
        const updatedUserList = [...userList];
        updatedUserList[userIndex] = { ...updatedUserList[userIndex], volume: Number(value) };
        return updatedUserList;
      }
      return userList;
    });
    setUsers(newUsers);
  };

  const handleDomainCountSubmit = (e) => {
    e.preventDefault();
    if (domainCount > 0) {
      setDomains(Array(Number(domainCount)).fill(''));
      setUserCounts(Array(Number(domainCount)).fill(''));
      setUsers(Array(Number(domainCount)).fill([]));
      setStep(2);
    }
  };

  const handleDomainSubmit = (e) => {
    e.preventDefault();
    if (domains.length === Number(domainCount) && !domains.includes('')) {
      setStep(3);
    } else {
      alert('Please enter all domain names before proceeding.');
    }
  };

  const handleUserCountSubmit = (e) => {
    e.preventDefault();
    if (userCounts.length === Number(domainCount) && !userCounts.includes('')) {
      setStep(4);
    } else {
      alert('Please enter the user count for all domains.');
    }
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    const allUsersEntered = users.every(
      (userList, index) =>
        userList.length === Number(userCounts[index]) &&
        userList.every((user) => user.name !== '' && user.volume >= 0)
    );
    if (allUsersEntered) {
      setStep(5);
    } else {
      alert('Please enter all user names and volumes for each domain.');
    }
  };

  const handleDateAndVolumeSubmit = (e) => {
    e.preventDefault();
    if (startDate && totalTargetVolume) {
      generateRampUpPlan();
      setStep(6);
    } else {
      alert('Please enter both the start date and total target volume.');
    }
  };

  const generateRampUpPlan = () => {
    const start = new Date(startDate);
    const dailyIncrease = 5;
    let plan = [];
    let currentVolume = users.reduce((total, domainUsers) => total + domainUsers.reduce((sum, user) => sum + Number(user.volume), 0), 0);

    let dayIndex = 0;

    while (currentVolume < totalTargetVolume) {
      const date = new Date(start);
      date.setDate(start.getDate() + dayIndex);

      if (date.getDay() !== 6 && date.getDay() !== 0) { // Skip weekends for volume increase
        const dayPlan = { date: date.toLocaleDateString(), domains: [] };

        users.forEach((domainUsers, domainIndex) => {
          const domainPlan = { domainName: domains[domainIndex], users: [] };

          domainUsers.forEach((user, userIndex) => {
            if (currentVolume < totalTargetVolume) {
              users[domainIndex][userIndex].volume += dailyIncrease;
              currentVolume += dailyIncrease;

              domainPlan.users.push({
                name: user.name,
                volume: users[domainIndex][userIndex].volume,
              });
            }
          });

          if (domainPlan.users.length > 0) {
            dayPlan.domains.push(domainPlan);
          }
        });

        plan.push(dayPlan);
      } else {
        // Add weekend dates without volume increase
        plan.push({
          date: date.toLocaleDateString(),
          domains: users.map((domainUsers, domainIndex) => ({
            domainName: domains[domainIndex],
            users: domainUsers.map((user) => ({
              name: user.name,
              volume: user.volume, // Keep volume unchanged for weekends
            })),
          })),
        });
      }
      dayIndex++;
    }

    setRampUpPlan(plan);
  };

  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
  
    // Add headers (SN, Domain Name, User Name, and dates)
    const dateHeaders = rampUpPlan.map(dayPlan => dayPlan.date).join(',');
    csvContent += `SN,Domain Name,User Name,${dateHeaders}\n`;
  
    // Create a mapping for each user to their respective volumes on different dates
    const userVolumeMap = {};
    const domainSNMap = {}; // Store SN for each domain
    let snCounter = 1; // Initialize SN counter
  
    rampUpPlan.forEach(dayPlan => {
      dayPlan.domains.forEach((domainPlan, domainIndex) => {
        const domainName = domainPlan.domainName;
  
        // Assign SN only if not already assigned for this domain
        if (!domainSNMap[domainName]) {
          domainSNMap[domainName] = snCounter++;
        }
  
        domainPlan.users.forEach(user => {
          const key = `${domainSNMap[domainName]}-${domainName}-${user.name}`;
          if (!userVolumeMap[key]) {
            userVolumeMap[key] = {
              sn: domainSNMap[domainName],
              domainName: domainName,
              userName: user.name,
              volumes: []
            };
          }
  
          userVolumeMap[key].volumes.push({
            volume: user.volume,
            isWeekend: dayPlan.date.includes('Saturday') || dayPlan.date.includes('Sunday'),
          });
        });
      });
    });
  
    // Ensure all users have consistent lengths across dates
    const maxDates = rampUpPlan.length;
    Object.values(userVolumeMap).forEach(userData => {
      const lastVolume = userData.volumes.slice(-1)[0].volume;
      while (userData.volumes.length < maxDates) {
        userData.volumes.push({ volume: lastVolume, isWeekend: false }); // Fill remaining dates with the last volume
      }
    });
  
    // Generate CSV rows with SN and domain-based structure
    let previousDomain = '';
    Object.values(userVolumeMap).forEach(userData => {
      // Add a blank row if switching to a new domain
      if (userData.domainName !== previousDomain) {
        if (previousDomain) {
          csvContent += `,,\n`; // Add empty row to simulate merged cell for previous domain
        }
        previousDomain = userData.domainName;
      }
  
      const row = `${userData.sn},${userData.domainName},${userData.userName},${userData.volumes.map(volumeData => volumeData.volume).join(',')}`;
      csvContent += `${row}\n`;
    });
  
    if (previousDomain) {
      csvContent += `,,\n`; // Add empty row at end if needed
    }
  
    // Highlight weekend cells in the CSV
    csvContent = csvContent.replace(/(\d+,)([^,]+Saturday|[^,]+Sunday)(,\d+)/g, '$1"$2"'); // Apply quotes to weekend cells for highlighting
  
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ramp_up_plan.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };  

  return (
    <div className="app-container glass-effect">
      {step === 1 && (
        <form onSubmit={handleDomainCountSubmit}>
          <label>
            Enter the number of domains:
            <input
              type="number"
              value={domainCount}
              onChange={handleDomainCountChange}
              min="1"
              className="input-field"
              required
              />
            </label>
            <button type="submit" className="submit-button">Next</button>
          </form>
        )}
  
        {step === 2 && (
          <form onSubmit={handleDomainSubmit}>
            {domains.map((domain, index) => (
              <div key={index}>
                <label>
                  Enter Domain {index + 1}:
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => handleDomainChange(index, e.target.value)}
                    className="input-field"
                    required
                  />
                </label>
              </div>
            ))}
            <button type="submit" className="submit-button">Next</button>
          </form>
        )}
  
        {step === 3 && (
          <form onSubmit={handleUserCountSubmit}>
            {domains.map((domain, index) => (
              <div key={index}>
                <label>
                  Enter the number of users for {domain}:
                  <input
                    type="number"
                    value={userCounts[index]}
                    onChange={(e) => handleUserCountChange(index, e.target.value)}
                    min="1"
                    className="input-field"
                    required
                  />
                </label>
              </div>
            ))}
            <button type="submit" className="submit-button">Next</button>
          </form>
        )}
  
        {step === 4 && (
          <form onSubmit={handleUserSubmit}>
            {domains.map((domain, domainIndex) => (
              <div key={domainIndex}>
                <h3>{domain}</h3>
                {users[domainIndex].map((user, userIndex) => (
                  <div key={userIndex}>
                    <label>
                      Enter User {userIndex + 1} Name:
                      <input
                        type="text"
                        value={user.name}
                        onChange={(e) => handleUserNameChange(domainIndex, userIndex, e.target.value)}
                        className="input-field"
                        required
                      />
                    </label>
                    <label>
                      Initial Volume for {user.name}:
                      <input
                        type="number"
                        value={user.volume}
                        onChange={(e) => handleUserVolumeChange(domainIndex, userIndex, e.target.value)}
                        min="0"
                        className="input-field"
                        required
                      />
                    </label>
                  </div>
                ))}
              </div>
            ))}
            <button type="submit" className="submit-button">Next</button>
          </form>
        )}
  
        {step === 5 && (
          <form onSubmit={handleDateAndVolumeSubmit}>
            <label>
              Start Date:
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
                required
              />
            </label>
            <label>
              Total Target Volume:
              <input
                type="number"
                value={totalTargetVolume}
                onChange={(e) => setTotalTargetVolume(e.target.value)}
                min="1"
                className="input-field"
                required
              />
            </label>
            <button type="submit" className="submit-button">Generate Plan</button>
          </form>
        )}
  
        {step === 6 && (
          <div>
            <h3>Ramp-Up Plan Generated!</h3>
            <button onClick={downloadCSV} className="submit-button">Download CSV</button>
          </div>
        )}
      </div>
    );
  }
  
  export default App;