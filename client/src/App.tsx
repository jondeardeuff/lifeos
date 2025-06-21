import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { client } from './apollo-client';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

function App() {
  const isAuthenticated = !!localStorage.getItem('accessToken');

  return (
    <ApolloProvider client={client}>
      <Router>
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/" />} />
        </Routes>
      </Router>
    </ApolloProvider>
  );
}

export default App;