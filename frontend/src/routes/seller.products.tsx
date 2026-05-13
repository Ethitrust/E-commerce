import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Plus, Pencil, Archive } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { SellerProduct, SellerProductPatchBody } from "@/lib/api/seller";
import {
  createSellerProduct,
  deleteSellerProduct,
  patchSellerProduct,
  fetchSellerProducts,
  uploadSellerProductImage,
} from "@/lib/api/seller";
import { fetchCategories } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/auth-session";
import { isDemoProfileUser } from "@/lib/auth/profile";
import { useAppStore } from "@/store/use-app-store";
import { toast } from "sonner";

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatMoney(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

const defaultImage =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80";

export const Route = createFileRoute("/seller/products")({
  component: SellerProductsPage,
});

function SellerProductsPage() {
  const user = useAppStore((s) => s.user);
  const qc = useQueryClient();

  const hydrateFromApi = Boolean(
    user && getAccessToken() && !isDemoProfileUser(user) && user.role === "seller",
  );

  const categoriesQuery = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: fetchCategories,
    enabled: hydrateFromApi,
    staleTime: 60_000,
  });

  const productsQuery = useQuery({
    queryKey: ["seller", "products", user?.id],
    queryFn: fetchSellerProducts,
    enabled: hydrateFromApi,
    staleTime: 15_000,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [categorySlug, setCategorySlug] = useState("");
  const [image, setImage] = useState(defaultImage);
  const [stock, setStock] = useState("0");
  const [description, setDescription] = useState("");
  const [imageUploadBusy, setImageUploadBusy] = useState(false);

  const editingProduct = useMemo(() => {
    if (!editingId || !productsQuery.data) {
      return null;
    }
    return productsQuery.data.find((p) => p.id === editingId) ?? null;
  }, [editingId, productsQuery.data]);

  const openCreate = () => {
    setEditingId(null);
    setTitle("");
    setSlug("");
    setPrice("");
    setCurrency("USD");
    setCategorySlug(categoriesQuery.data?.[0]?.slug ?? "");
    setImage(defaultImage);
    setStock("0");
    setDescription("");
    setDialogOpen(true);
  };

  const openEdit = (p: SellerProduct) => {
    setEditingId(p.id);
    setTitle(p.title);
    setSlug(p.slug);
    setPrice(String(p.price));
    setCurrency(p.currency);
    setCategorySlug(p.categorySlug);
    setImage(p.image || defaultImage);
    setStock(String(p.stock));
    setDescription(p.description ?? "");
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const slugValue = slug.trim() || slugify(title);
      if (!slugValue) {
        throw new Error("Add a slug or title that yields a slug.");
      }
      return createSellerProduct({
        title: title.trim(),
        slug: slugValue,
        price: Number(price),
        currency: currency.trim() || undefined,
        categorySlug: categorySlug.trim(),
        image: image.trim(),
        stock: Number.parseInt(stock, 10) || 0,
        description: description.trim() || undefined,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["seller"] });
      void qc.invalidateQueries({ queryKey: ["seller", "products"] });
      toast.success("Product created");
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : String(e)),
  });

  const patchMutation = useMutation({
    mutationFn: async () => {
      if (!editingProduct) {
        throw new Error("Missing product");
      }
      const body: SellerProductPatchBody = {};

      if (title.trim() !== editingProduct.title) {
        body.title = title.trim();
      }
      const slugNext = slug.trim().toLowerCase();
      if (slugNext !== editingProduct.slug) {
        if (!slugNext.length) {
          throw new Error("Slug cannot be empty");
        }
        body.slug = slugNext;
      }
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum)) {
        throw new Error("Enter a valid price");
      }
      if (priceNum !== editingProduct.price) {
        body.price = priceNum;
      }
      const cur = currency.trim() || editingProduct.currency;
      if (cur !== editingProduct.currency) {
        body.currency = cur;
      }
      if (categorySlug.trim() !== editingProduct.categorySlug) {
        body.categorySlug = categorySlug.trim();
      }
      if ((image.trim() || defaultImage) !== editingProduct.image) {
        body.image = image.trim() || defaultImage;
      }
      const stockNum = Number.parseInt(stock, 10);
      const safeStock = Number.isFinite(stockNum) ? stockNum : editingProduct.stock;
      if (safeStock !== editingProduct.stock) {
        body.stock = safeStock;
      }
      const descTrim = description.trim();
      if (descTrim !== (editingProduct.description ?? "")) {
        body.description = descTrim;
      }

      const keys = Object.keys(body).filter((k) => body[k as keyof typeof body] !== undefined);
      if (keys.length === 0) {
        toast.info("Nothing to save — adjust a field first.");
        return editingProduct;
      }

      return patchSellerProduct(editingProduct.id, body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["seller"] });
      void qc.invalidateQueries({ queryKey: ["seller", "products"] });
      toast.success("Product updated");
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : String(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSellerProduct(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["seller"] });
      void qc.invalidateQueries({ queryKey: ["seller", "products"] });
      toast.success("Listing archived");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : String(e)),
  });

  const handleListingImageChosen = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || imageUploadBusy || createMutation.isPending || patchMutation.isPending) {
      return;
    }
    setImageUploadBusy(true);
    try {
      const { url } = await uploadSellerProductImage(file);
      setImage(url);
      toast.success("Image uploaded.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not upload image.");
    } finally {
      setImageUploadBusy(false);
    }
  };

  const onTitleBlurCreate = () => {
    if (!editingProduct && title.trim().length && !slug.trim()) {
      setSlug(slugify(title));
    }
  };

  if (productsQuery.isPending || categoriesQuery.isPending) {
    return (
      <div className="py-4">
        <p className="text-sm text-muted-foreground">Loading inventory…</p>
      </div>
    );
  }

  if (productsQuery.isError || categoriesQuery.isError) {
    return (
      <div className="py-4">
        <p className="text-sm text-destructive">Could not load products.</p>
      </div>
    );
  }

  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const mutationsBusy = createMutation.isPending || patchMutation.isPending;
  const uiLocked = mutationsBusy || imageUploadBusy;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your products</h1>
          <p className="text-sm text-muted-foreground">
            New submissions start as pending moderation. Archive removes listings from buyer-facing
            catalogs.
          </p>
        </div>
        <Button onClick={openCreate} disabled={categories.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Add product
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted-foreground" colSpan={6}>
                  No products yet — add your first listing.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <img src={p.image} alt="" className="h-full w-full object-cover" />
                      </div>
                      <span className="font-medium">{p.title}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{p.slug}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      {p.moderationStatus}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{p.stock}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                    {formatMoney(p.price, p.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Edit ${p.title}`}
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Archive ${p.title}`}
                        disabled={deleteMutation.isPending || imageUploadBusy}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Archive “${p.title}”? It will disappear from storefront catalog reads.`,
                            )
                          ) {
                            deleteMutation.mutate(p.id);
                          }
                        }}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-title">Title</Label>
              <Input
                id="sp-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={onTitleBlurCreate}
                disabled={uiLocked}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-slug">Slug</Label>
              <Input
                id="sp-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.trim().toLowerCase())}
                disabled={uiLocked}
                spellCheck={false}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sp-price">Price</Label>
                <Input
                  id="sp-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={uiLocked}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-currency">Currency</Label>
                <Input
                  id="sp-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.trim().toUpperCase())}
                  disabled={uiLocked}
                  maxLength={8}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={categorySlug || (categories[0]?.slug ?? "")}
                onValueChange={setCategorySlug}
                disabled={uiLocked || categories.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-image">Primary image</Label>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Paste an image URL or upload a file — sent through the API to Cloudinary (JPEG, PNG,
                WebP, or GIF, up to 5 MB).
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <Input
                  id="sp-image"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  disabled={uiLocked}
                  placeholder="https://..."
                  className="sm:flex-1"
                />
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => {
                    void handleListingImageChosen(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 sm:w-auto"
                  disabled={uiLocked}
                  onClick={() => imageFileInputRef.current?.click()}
                >
                  {imageUploadBusy ? "Uploading…" : "Upload file"}
                </Button>
              </div>
              {image.startsWith("http") ? (
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-stock">Stock</Label>
              <Input
                id="sp-stock"
                type="number"
                min={0}
                step={1}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                disabled={uiLocked}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-desc">Description</Label>
              <Textarea
                id="sp-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={uiLocked}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setDialogOpen(false)}
              disabled={uiLocked}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                mutationsBusy ||
                imageUploadBusy ||
                !title.trim() ||
                !categorySlug ||
                price === "" ||
                Number.isNaN(Number(price))
              }
              onClick={() => {
                if (editingProduct) {
                  patchMutation.mutate();
                } else {
                  createMutation.mutate();
                }
              }}
            >
              {mutationsBusy ? "Saving…" : editingProduct ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
