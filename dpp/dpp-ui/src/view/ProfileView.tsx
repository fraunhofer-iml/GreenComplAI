import React from 'react';
import '../css/App.css';
import {Box} from "@mui/material";
import kittenGif from '../assets/kitten-keybo.gif';

export default function ProfileView() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh', // Gesamter Viewport
                textAlign: 'center',
            }}
        >
            <h2>Welcome to the Profile Page</h2>
            <Box
                component="img"
                src={kittenGif}
                alt="Cute kitten typing on keyboard"
                sx={{
                    maxWidth: '300px',
                    marginTop: '20px',
                }}
            />
        </Box>
    );
}