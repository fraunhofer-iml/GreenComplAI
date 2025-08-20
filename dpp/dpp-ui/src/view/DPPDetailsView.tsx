import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Paper, CircularProgress, Alert, Box } from '@mui/material';
import AASOutput from '../components/dashboard/AASOutput';
import BaSyxFetchService from '../service/BaSyxFetchService';
import AASService from '../service/AASService';
import { AAS, Submodel } from '../data/AasZod';

const DPPDetailsView = () => {
  const { dppId } = useParams<{ dppId: string }>();
  const [dpp, setDpp] = useState<AAS | null>(null);
  const [submodels, setSubmodels] = useState<Submodel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDppData = async () => {
      if (!dppId) return;
      setLoading(true);
      setError(null);
      try {
        const dppData = await BaSyxFetchService.fetchShell(dppId);
        if (!dppData) throw new Error('Failed to load DPP.');
        const parsedDpp = await AASService.parseAASJsonToDataModel(dppData);
        if (!parsedDpp) throw new Error('Failed to parse DPP data.');

        const loadedSubmodels: Submodel[] = [];
        if (parsedDpp.submodels) {
          for (const submodel of parsedDpp.submodels) {
            const submodelId = submodel.keys.find(
              (k) => k.type === 'Submodel'
            )?.value;
            if (!submodelId) continue;
            try {
              const res = await BaSyxFetchService.fetchSubmodel(submodelId);
              if (!res) continue;
              const parsed = await AASService.parseSubmodelJsonToDataModel(res);
              if (parsed) loadedSubmodels.push(parsed);
            } catch (error) {
              console.error(error);
            }
          }
        }
        setDpp(parsedDpp);
        setSubmodels(loadedSubmodels);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDppData();
  }, [dppId]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh" // volle Höhe
      >
        <CircularProgress size={120} thickness={2.5} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!dpp) {
    return <div>No DPP data provided.</div>;
  }

  return <AASOutput aas={dpp} submodels={submodels} />;
};

export default DPPDetailsView;
