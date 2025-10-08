import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Building2, Upload, X } from "lucide-react";

const companySettingsSchema = z.object({
  company_name: z.string().min(1, "Le nom de l'entreprise est requis"),
  company_address: z.string().min(1, "L'adresse est requise"),
  company_siret: z.string().min(1, "Le numéro SIRET est requis"),
  company_phone: z.string().min(1, "Le téléphone est requis"),
  company_email: z.string().email("Email invalide").min(1, "L'email est requis"),
  company_logo_url: z.string().url("URL invalide").optional().or(z.literal("")),
  is_active: z.boolean(),
});

type CompanySettingsFormData = z.infer<typeof companySettingsSchema>;

interface CompanySetting {
  id: string;
  company_name: string;
  company_address: string;
  company_siret: string;
  company_phone: string;
  company_email: string;
  company_logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function CompanySettingsForm() {
  const [companySettings, setCompanySettings] = useState<CompanySetting | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<CompanySettingsFormData>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      company_name: "",
      company_address: "",
      company_siret: "",
      company_phone: "",
      company_email: "",
      company_logo_url: "",
      is_active: true,
    },
  });

  const fetchCompanySettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setCompanySettings(data);
        setLogoPreview(data.company_logo_url || "");
        form.reset({
          company_name: data.company_name,
          company_address: data.company_address,
          company_siret: data.company_siret,
          company_phone: data.company_phone,
          company_email: data.company_email,
          company_logo_url: data.company_logo_url || "",
          is_active: data.is_active,
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres de l'entreprise",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCompanySettings();
  }, [user]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    form.setValue("company_logo_url", "");
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) return null;

    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('company-logos')
      .upload(fileName, logoFile, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('company-logos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const onSubmit = async (data: CompanySettingsFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      let logoUrl = data.company_logo_url;

      // Upload du logo si un fichier a été sélectionné
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      const settingsData = {
        ...data,
        company_logo_url: logoUrl,
      };

      if (companySettings) {
        const { error } = await supabase
          .from("company_settings")
          .update({ ...settingsData, updated_at: new Date().toISOString() })
          .eq("id", companySettings.id)
          .eq("user_id", user.id);

        if (error) throw error;
        
        toast({
          title: "Succès",
          description: "Paramètres de l'entreprise mis à jour",
        });
      } else {
        const { error } = await supabase
          .from("company_settings")
          .insert({
            ...settingsData,
            user_id: user.id
          });

        if (error) throw error;
        
        toast({
          title: "Succès",
          description: "Paramètres de l'entreprise ajoutés",
        });
      }

      setLogoFile(null);
      fetchCompanySettings();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informations de l'entreprise
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="company_name">Nom de l'entreprise</Label>
            <Input
              id="company_name"
              {...form.register("company_name")}
              placeholder="Ma Société SARL"
            />
            {form.formState.errors.company_name && (
              <p className="text-sm text-destructive">{form.formState.errors.company_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="company_address">Adresse</Label>
            <Textarea
              id="company_address"
              {...form.register("company_address")}
              placeholder="123 rue de la République&#10;75001 Paris"
              rows={3}
            />
            {form.formState.errors.company_address && (
              <p className="text-sm text-destructive">{form.formState.errors.company_address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_siret">Numéro SIRET</Label>
              <Input
                id="company_siret"
                {...form.register("company_siret")}
                placeholder="12345678901234"
              />
              {form.formState.errors.company_siret && (
                <p className="text-sm text-destructive">{form.formState.errors.company_siret.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="company_phone">Téléphone</Label>
              <Input
                id="company_phone"
                {...form.register("company_phone")}
                placeholder="01 23 45 67 89"
              />
              {form.formState.errors.company_phone && (
                <p className="text-sm text-destructive">{form.formState.errors.company_phone.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="company_email">Email</Label>
            <Input
              id="company_email"
              type="email"
              {...form.register("company_email")}
              placeholder="contact@masociete.com"
            />
            {form.formState.errors.company_email && (
              <p className="text-sm text-destructive">{form.formState.errors.company_email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="company_logo">Logo de l'entreprise (optionnel)</Label>
            <div className="space-y-4">
              {logoPreview && (
                <div className="relative inline-block">
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="h-24 w-auto rounded border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  id="company_logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => document.getElementById('company_logo')?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Formats acceptés: PNG, JPG, WEBP (max 5MB)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              {...form.register("is_active")}
            />
            <Label htmlFor="is_active">Configuration active</Label>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {companySettings ? "Mettre à jour" : "Sauvegarder"}
      </Button>
    </form>
  );
}