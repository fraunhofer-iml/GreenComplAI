import { Box, Paper } from '@mui/material';
import { Outlet } from 'react-router-dom';
import AppBar from '../components/navigation/AppBar';
import SideBar from '../components/navigation/SideBar';

const DashboardLayout = () => {
    return (
        <div style={{ height: '100vh' }}>
            <AppBar />
            <Box sx={{ display: 'flex', height: '100vh' }}>
                <SideBar />
                <Box
                    component="main"
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        flexGrow: 1,
                        height: '100vh',
                        overflow: 'auto',
                        p: 3,
                    }}
                >
                    {/* Hier kommt der dynamische Content */}
                    {/* Die Komponente Outlet ist dafür zuständig */}
                    <Outlet />
                </Box>
            </Box>
        </div>
    );
};

export default DashboardLayout;
