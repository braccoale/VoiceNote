import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const Config = {
  supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '') as string,
  supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? '') as string,
  functionSecret: (process.env.EXPO_PUBLIC_FUNCTION_SECRET ?? extra.functionSecret ?? '') as string,
  transcribeUrl: `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? ''}/functions/v1/transcribe-audio`,
};
