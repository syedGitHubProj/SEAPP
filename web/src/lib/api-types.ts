/** Shapes returned by the SellEase API (see api/src/SellEase.Api). Money is in rupees. */

export type ApiRole = "Admin" | "Manager" | "Salesman";

export interface Me {
  id: string;
  userName: string;
  fullName: string;
  role: ApiRole;
  permissions: string[];
}

export interface CustomerDto {
  id: string;
  number: string;
  name: string;
  phone: string;
  address: string | null;
  note: string | null;
  isActive: boolean;
  version: number;
}

export interface FactoryDto {
  id: string;
  number: string;
  name: string;
  contactPerson: string | null;
  phone: string;
  city: string;
  speciality: string | null;
  isActive: boolean;
  version: number;
}

export interface CategoryDto {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  version: number;
}

export interface MaterialDto {
  id: string | null;
  name: string;
  surcharge: number;
}

export interface ColorDto {
  id: string | null;
  name: string;
  hex: string;
}

export interface AccessoryDto {
  id: string | null;
  name: string;
  price: number;
}

export interface PhotoDto {
  id: string;
  url: string;
}

export interface DesignDto {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  basePrice: number;
  dimensions: string | null;
  wood: string | null;
  description: string | null;
  materials: MaterialDto[];
  colors: ColorDto[];
  accessories: AccessoryDto[];
  isActive: boolean;
  version: number;
  photos: PhotoDto[];
}

export interface UserDto {
  id: string;
  userName: string;
  fullName: string;
  role: ApiRole;
  isActive: boolean;
}

export interface SettingsDto {
  businessName: string;
  currencyCode: string;
  currencySymbol: string;
  timeZone: string;
}

export interface AuditDto {
  id: string;
  at: string;
  userName: string | null;
  /** Added, Modified, Deleted, or a named action such as PasswordReset. */
  action: string;
  entityType: string;
  entityId: string;
  /** A readable name for the record, e.g. "CU-000012 Ahmed Raza". */
  label: string | null;
  /** JSON describing the change. */
  changes: string | null;
}
