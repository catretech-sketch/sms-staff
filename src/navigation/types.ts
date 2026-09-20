export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  Attendance: undefined;
  Trip: undefined;
  Issues: undefined;
  VehicleCheck: undefined;
  LiveMap: { tripId: string };
  RoutePreview: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Leave: undefined;
  Tasks: undefined;
  Me: undefined;
};
