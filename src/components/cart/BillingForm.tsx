import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Pencil } from "lucide-react";
import { useState } from "react";

interface BillingData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  country: string;
}

interface BillingFormProps {
  data: BillingData;
  onChange: (data: BillingData) => void;
}

const countries = [
  "Togo", "Bénin", "Ghana", "Burkina Faso", "Côte d'Ivoire", 
  "Niger", "Nigeria", "Sénégal", "Mali", "Cameroun"
];

const BillingForm = ({ data, onChange }: BillingFormProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const update = (field: keyof BillingData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const hasData = data.firstName || data.lastName || data.phone;

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <User className="w-5 h-5 text-primary" />
            Détails de facturation
          </CardTitle>
          {hasData && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Pencil className="w-3 h-3" />Modifier
            </button>
          )}
        </div>
        {hasData && !isEditing && (
          <p className="text-[10px] text-muted-foreground mt-1">
            ✓ Informations pré-remplies depuis votre profil
          </p>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {hasData && !isEditing ? (
          <div className="space-y-2 p-3 bg-muted/50 rounded-xl text-sm">
            <p className="font-medium text-foreground">
              {data.firstName} {data.lastName}
            </p>
            {data.company && <p className="text-muted-foreground">{data.company}</p>}
            <p className="text-muted-foreground">{data.email}</p>
            <p className="text-muted-foreground">{data.phone}</p>
            <p className="text-muted-foreground">{data.country}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Prénom <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={data.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  placeholder="Votre prénom"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Nom <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={data.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  placeholder="Votre nom"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nom de l'entreprise (optionnel)</Label>
              <Input
                value={data.company}
                onChange={(e) => update("company", e.target.value)}
                placeholder="Nom de l'entreprise"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Pays/région <span className="text-destructive">*</span>
              </Label>
              <Select value={data.country} onValueChange={(v) => update("country", v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  value={data.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="email@exemple.com"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Téléphone <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+228 90 XX XX XX"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {isEditing && (
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs text-primary hover:underline"
              >
                ✓ Valider les modifications
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BillingForm;
