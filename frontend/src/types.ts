export type Project = {
  id: number;
  title: string;
  description: string;
  category: string;
  technologies: string[];
  imageUrl: string;
  mediaUrl: string;
  demoUrl: string;
  repoUrl: string;
  contactName: string;
  contactEmail: string;
  contactUrl: string;
  createdAt: string;
  ownershipEnabled: boolean;
  ratingAverage: number;
  ratingCount: number;
};

export type ProjectFilters = {
  category: string;
  technology: string;
  q: string;
};

export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'ownershipEnabled' | 'ratingAverage' | 'ratingCount'>;

export type ApiFieldError = { field: string; message: string };
