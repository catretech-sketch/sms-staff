export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  Attendance: undefined;
  Trip: undefined;
  LiveMap: { tripId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Leave: undefined;
  Tasks: undefined;
  Me: undefined;
};
