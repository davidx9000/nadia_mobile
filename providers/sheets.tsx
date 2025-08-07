import {registerSheet} from 'react-native-actions-sheet';
import tipSheet from '@/components/sheets/tip';
 
registerSheet('tipSheet', tipSheet);
 
declare module 'react-native-actions-sheet' {
  interface Sheets {
    'tipSheet': SheetDefinition,
  }
}
 
export {};