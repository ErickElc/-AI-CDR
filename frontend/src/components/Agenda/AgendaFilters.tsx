import React from 'react';
import {
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { Unit, Procedure } from '../../types';

interface AgendaFiltersProps {
    units: Unit[];
    procedures: Procedure[];
    selectedUnit: string;
    selectedProcedure: string;
    onUnitChange: (value: string) => void;
    onProcedureChange: (value: string) => void;
}

export const AgendaFilters: React.FC<AgendaFiltersProps> = ({
    units,
    procedures,
    selectedUnit,
    selectedProcedure,
    onUnitChange,
    onProcedureChange,
}) => {
    return (
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <FormControl fullWidth size="small">
                <InputLabel>Unidade</InputLabel>
                <Select
                    value={selectedUnit}
                    label="Unidade"
                    onChange={(e: SelectChangeEvent) => onUnitChange(e.target.value)}
                >
                    <MenuItem value="">Selecione</MenuItem>
                    {units.map((unit) => (
                        <MenuItem key={unit.id} value={unit.nome}>
                            {unit.nome}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth size="small">
                <InputLabel>Especialidade</InputLabel>
                <Select
                    value={selectedProcedure}
                    label="Especialidade"
                    onChange={(e: SelectChangeEvent) => onProcedureChange(e.target.value)}
                >
                    <MenuItem value="">Selecione</MenuItem>
                    {procedures.map((proc) => (
                        <MenuItem key={proc.id} value={proc.nome}>
                            {proc.nome}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
};
