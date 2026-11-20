import { Trash2 } from 'lucide-react';
import React, { useState } from 'react';

import {
  formatExtraBodyValue,
  normalizeExtraBodyKey,
  parseExtraBodyValue,
} from '../../lib/extraBodyValue';
import { Button } from './Button';
import { DebouncedInput } from './DebouncedInput';

interface Props {
  fieldKey: string;
  value: unknown;
  onKeyChange: (nextKey: string) => void;
  onValueChange: (nextValue: unknown) => void;
  onRemove: () => void;
}

/**
 * One extra-body key/value row. Rejects unparseable JSON instead of storing it
 * as a raw string, and strips surrounding quotes from field names.
 */
export const ExtraBodyFieldRow: React.FC<Props> = ({
  fieldKey,
  value,
  onKeyChange,
  onValueChange,
  onRemove,
}) => {
  const [valueError, setValueError] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
      <DebouncedInput
        placeholder="Field Name"
        value={fieldKey}
        onChange={(nextKey: string) => onKeyChange(normalizeExtraBodyKey(nextKey))}
        style={{ flex: 1 }}
      />
      <DebouncedInput
        placeholder="Value"
        value={formatExtraBodyValue(value)}
        error={valueError ?? undefined}
        onChange={(raw: string) => {
          const parsed = parseExtraBodyValue(raw);
          if (!parsed.ok) {
            setValueError(parsed.error);
            return;
          }
          setValueError(null);
          onValueChange(parsed.value);
        }}
        style={{ flex: 1 }}
      />
      <Button variant="ghost" size="sm" onClick={onRemove} style={{ padding: '4px' }}>
        <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
      </Button>
    </div>
  );
};
