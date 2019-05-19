export interface UamEnvironmentDetails{
	apiUrl: string; //the apiUrl of the UAM services (User and Account Management)
	clientId: string;
	cachedAt: number; //epoch time when this object was cached
}
export interface EnvironmentDetails{
	uam: UamEnvironmentDetails
}