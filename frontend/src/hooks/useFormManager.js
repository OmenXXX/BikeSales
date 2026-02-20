import { useState, useCallback, useRef } from 'react';

/**
 * Hook for managing form state with "User-Touched" delta tracking.
 * Prevents sending unnecessary or read-only fields to the backend.
 */
const useFormManager = (initialFields = {}) => {
    const [touchedFields, setTouchedFields] = useState(new Set());
    const [formData, setFormData] = useState(initialFields);

    const blockedSuffixes = ['Timestamp', 'Date_c', 'ID'];

    const handleChange = useCallback((fieldName, value) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        setTouchedFields(prev => {
            const next = new Set(prev);
            next.add(fieldName);
            return next;
        });
    }, []);

    /**
     * Constructs a payload containing only the fields the user has interacted with.
     * Also filters out fields with blocked suffixes.
     */
    const getDeltaPayload = useCallback(() => {
        const payload = {};

        touchedFields.forEach(fieldName => {
            // Block fields based on suffixes (Frontend Safety)
            const isBlocked = blockedSuffixes.some(suffix => fieldName.endsWith(suffix));

            if (!isBlocked) {
                payload[fieldName] = formData[fieldName];
            } else {
                console.log(`%c FORM_MANAGER: Skipping blocked field '${fieldName}' in delta payload `, "color: #f87171; font-weight: bold;");
            }
        });

        console.log("%c FORM_MANAGER: DELTA_PAYLOAD: Only sending:", "color: #34d399; font-weight: bold;", Object.keys(payload));
        return payload;
    }, [formData, touchedFields]);

    const reset = useCallback((newData = {}) => {
        setFormData(newData);
        setTouchedFields(new Set());
    }, []);

    return {
        formData,
        touchedFields,
        handleChange,
        getDeltaPayload,
        reset,
        setFormData
    };
};

export default useFormManager;
