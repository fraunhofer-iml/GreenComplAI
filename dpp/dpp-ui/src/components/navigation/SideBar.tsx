import '../../css/App.css';
import {Box, Drawer, Divider, List, ListItem, ListItemText, Toolbar, ListItemButton, ListItemIcon} from "@mui/material";
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import PublishIcon from '@mui/icons-material/Publish';
import {useNavigate} from "react-router-dom";

export default function SideBar() {
    const navigate = useNavigate(); // Hook für die Navigation

    return (
        <Drawer
            variant='permanent'
            sx={{
                width: 250,
                flexShrink: 0,
                ['& .MuiDrawer-paper']: {
                    width: 250,
                    boxSizing: 'border-box',
                },
            }}
            >

                <Toolbar />
                <Box sx={{overflow: 'auto'}}>
                    <List>
                        <ListItem>
                            <ListItemButton
                                onClick={() => {navigate('/dashboard');}}
                            >
                                <ListItemIcon>
                                    <LeaderboardIcon />
                                </ListItemIcon>
                                <ListItemText primary="Dashboard" />
                            </ListItemButton>
                        </ListItem>
                        <ListItem>
                            <ListItemButton
                                onClick={() => {navigate('/dashboard/management');}}
                            >
                                <ListItemIcon>
                                    <PublishIcon />
                                </ListItemIcon>
                                <ListItemText primary="Management" />
                            </ListItemButton>
                        </ListItem>
                    </List>
                    <Divider />
                    <List>
                        <ListItem>
                            <ListItemButton
                                onClick={() => {navigate('/dashboard/profile');}}
                            >
                                <ListItemIcon>
                                    <PersonIcon />
                                </ListItemIcon>
                                <ListItemText primary="Profile" />
                            </ListItemButton>
                        </ListItem>
                    </List>
                </Box>
            </Drawer>
    );
}
