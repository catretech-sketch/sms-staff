export type RootStackParamList = {
  // Splash + Attendance are forward-declared for later plans (Splash screen in
  // Plan 3, Attendance overlay in Plan 4); they are not wired into a navigator yet.
  Splash: undefined;
  Login: undefined;
  Main: undefined;
  Attendance: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Roster: undefined;
  Tasks: undefined;
  Me: undefined;
};
