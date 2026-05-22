/**
 * Provider Settings Component
 * V106: Provider Abstraction
 */

import React, { useState } from 'react';
import { MyDialog } from '../MUI替代';
import { MyList, MyListItem, MyListItemText, MyButton, MyTextField, MyIconButton, MyBox, MyTypography } from '../MUI替代';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { builtInProviders } from '../../services/providers';

const ProviderSettings: React.FC = () => {
  const [providers, setProviders] = useState(builtInProviders);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    apiKey: '',
    model: '',
  });

  const handleAddProvider = () => {
    const newProvider = {
      id: `custom-${Date.now()}`,
      name: formData.name,
      apiKey: formData.apiKey,
      model: formData.model,
      enabled: true,
    };
    setProviders([...providers, newProvider]);
    setDialogOpen(false);
    setFormData({ name: '', apiKey: '', model: '' });
  };

  const handleDeleteProvider = (id: string) => {
    setProviders(providers.filter((p) => p.id !== id));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Providers</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Provider
        </Button>
      </Box>

      <List>
        {providers.map((provider) => (
          <ListItem
            key={provider.id}
            secondaryAction={
              <IconButton edge="end" onClick={() => handleDeleteProvider(provider.id)}>
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemText
              primary={provider.name}
              secondary={`Model: ${provider.model} | ID: ${provider.id}`}
            />
          </ListItem>
        ))}
      </List>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Provider</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Provider Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="API Key"
            type="password"
            fullWidth
            value={formData.apiKey}
            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Model"
            fullWidth
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddProvider} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProviderSettings;