import {AppBar, Box, Divider, Toolbar, Typography} from '@mui/material';

export default function ButtonAppBar() {
  return (
    <Box sx={{ flexGrow: 1}}>
      <AppBar position="static" sx={{ bgcolor: 'white' }}>
        <Toolbar>
          <Typography variant="h2" component="div" sx={{ flexGrow: 1, textAlign: 'center', color: 'black' }}>
            SKALA APP
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'grey', mx: 2 }} />
          <Box sx={{ ml: 2 }}>
            <img
              src="/skala-logo.jpg"
              alt="Logo"
              style={{ height: 48 }}
            />
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
