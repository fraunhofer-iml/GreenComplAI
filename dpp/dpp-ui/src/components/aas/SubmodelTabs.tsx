import {Tabs, Tab, Box, Paper} from "@mui/material";
import {useState} from "react";
import SubmodelPanel from "./SubmodelPanel";
import TabPanel from "./TabPanel";
import {Submodel} from "../../data/AasZod";

export default function SubmodelTabs({submodels}: { submodels: Submodel[] }) {
    const [tabIndex, setTabIndex] = useState(0);

    return (
        <>
            <Box display="flex" gap={5} m={2}>
                <Paper elevation={1} sx={{p: 2, flex: 1, minWidth: 220}}>
                    <Tabs
                        value={tabIndex}
                        onChange={(_, newIndex) => setTabIndex(newIndex)}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                    >
                        {submodels.map((sm, idx) => (
                            <Tab key={sm.id} label={sm.idShort}/>
                        ))}
                    </Tabs>
                    {submodels.map((sm, idx) => (
                        <TabPanel key={sm.id} value={tabIndex} index={idx}>
                            <SubmodelPanel submodel={sm}/>
                        </TabPanel>
                    ))}
                </Paper>
            </Box>
        </>
    );
}
