import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import AppBar from '../components/navigation/AppBar';
import SideBar from '../components/navigation/SideBar';

const DashboardLayout = () => (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar />
        <Box sx={{ display: 'flex', flexGrow: 1, height: '100%' }}>
            <SideBar />
            <Box
                component="main"
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    height: '100%',
                    overflow: 'auto',
                    p: 3,
                }}
            >
                <Outlet />
            </Box>
        </Box>
    </Box>
);

export default DashboardLayout;
