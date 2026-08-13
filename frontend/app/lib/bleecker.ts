/**
 * Bleecker 0.1.39's package root currently references missing ESM barrel files.
 * Its documented component/layout subpath exports are intact, so the app keeps
 * the workaround in one place until the package root is republished.
 */
import { createElement } from 'react';
import {
  Select as BleeckerSelect,
  type SelectProps,
} from '@gaulatti/bleecker/components/select';

export { AdminShell } from '@gaulatti/bleecker/layout/admin-shell';
export { Header } from '@gaulatti/bleecker/layout/header';

export { AlertDialog } from '@gaulatti/bleecker/components/alert-dialog';
export { BauhausBackground } from '@gaulatti/bleecker/components/bauhaus-background';
export { BrandLockup } from '@gaulatti/bleecker/components/brand-lockup';
export { Button } from '@gaulatti/bleecker/components/button';
export { Card } from '@gaulatti/bleecker/components/card';
export { Checkbox } from '@gaulatti/bleecker/components/checkbox';
export { DataList } from '@gaulatti/bleecker/components/data-list';
export { Empty } from '@gaulatti/bleecker/components/empty';
export { ErrorState } from '@gaulatti/bleecker/components/error-state';
export { Field } from '@gaulatti/bleecker/components/field';
export { FileInput } from '@gaulatti/bleecker/components/file-input';
export { IconBadge } from '@gaulatti/bleecker/components/icon-badge';
export { IconButton } from '@gaulatti/bleecker/components/icon-button';
export { Input } from '@gaulatti/bleecker/components/input';
export { LoadingOverlay } from '@gaulatti/bleecker/components/loading-overlay';
export { LoadingSpinner } from '@gaulatti/bleecker/components/loading-spinner';
export { PageHeader } from '@gaulatti/bleecker/components/page-header';
export { SearchInput } from '@gaulatti/bleecker/components/search-input';
export { Sheet } from '@gaulatti/bleecker/components/sheet';
export { Sidebar } from '@gaulatti/bleecker/components/sidebar';
export { SkeletonCard, SkeletonTable } from '@gaulatti/bleecker/components/skeleton';
export { Sonner, toast } from '@gaulatti/bleecker/components/sonner';
export { StatCard } from '@gaulatti/bleecker/components/stat-card';
export { StatusBadge } from '@gaulatti/bleecker/components/status-badge';
export { DataTable } from '@gaulatti/bleecker/components/table';
export { Tabs } from '@gaulatti/bleecker/components/tabs';

/**
 * Bleecker maps an empty controlled value to `undefined` unless the option list
 * also contains an empty value. Supplying a disabled placeholder option keeps
 * Radix Select controlled for its full lifetime without changing the app API.
 */
export function Select(props: SelectProps) {
  const options = props.value === '' && !props.options.some((option) => option.value === '')
    ? [{ disabled: true, label: props.placeholder ?? 'Select…', value: '' }, ...props.options]
    : props.options;

  return createElement(BleeckerSelect, { ...props, options });
}

export type { ButtonProps, ButtonSize, ButtonVariant } from '@gaulatti/bleecker/components/button';
export type { CardPadding, CardVariant } from '@gaulatti/bleecker/components/card';
export type { ColumnDef, SortState } from '@gaulatti/bleecker/components/table';
export type { NavItem } from '@gaulatti/bleecker/components/nav-menu';
export type { SelectProps } from '@gaulatti/bleecker/components/select';
export type { SidebarItem } from '@gaulatti/bleecker/components/sidebar';
