"""
Google Maps → CRM Divulga BR
==============================
Busca estabelecimentos no Google Places API e importa direto no CRM.

Requisitos:
  pip install requests

Uso:
  python maps_para_crm.py
  python maps_para_crm.py --nicho "Salão de Beleza" --cidade "Campinas" --estado SP --max 100
"""

import requests
import time
import argparse
import sys

# ─── CONFIGURAÇÃO ────────────────────────────────────────────────────────────
GOOGLE_API_KEY = "SUA_GOOGLE_PLACES_API_KEY"   # console.cloud.google.com
CRM_BASE       = "https://crm.divulgabr.com.br/api"
CRM_SLUG       = "SEU_SLUG"                     # slug do tenant no CRM
CRM_EMAIL      = "admin@suaempresa.com"
CRM_SENHA      = "suasenha"

# ─── MAPEAMENTO nicho → estado → UF ─────────────────────────────────────────
NICHOS_VALIDOS = [
    "Alimentação", "Saúde e Beleza", "Educação", "Serviços Automotivos",
    "Construção e Reforma", "Tecnologia", "Advocacia e Contabilidade",
    "Imóveis", "Fitness e Esporte", "Pet Shop",
]

# ─── LOGIN NO CRM ─────────────────────────────────────────────────────────────
def login_crm():
    print(f"[CRM] Autenticando em {CRM_BASE}...")
    r = requests.post(
        f"{CRM_BASE}/auth/login",
        json={"email": CRM_EMAIL, "senha": CRM_SENHA},
        headers={"X-Tenant-Slug": CRM_SLUG},
        timeout=15,
    )
    if r.status_code != 200:
        print(f"[ERRO] Login falhou: {r.text}")
        sys.exit(1)
    token = r.json()["token"]
    print("[CRM] Autenticado com sucesso.")
    return token


# ─── BUSCA NO GOOGLE PLACES ──────────────────────────────────────────────────
def buscar_places(query, api_key, max_resultados=60):
    """Busca no Google Places Text Search, até 3 páginas (60 resultados)."""
    url      = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    lugares  = []
    pagina   = 0
    token_pg = None

    while pagina < 3 and len(lugares) < max_resultados:
        params = {"query": query, "key": api_key, "language": "pt-BR"}
        if token_pg:
            params = {"pagetoken": token_pg, "key": api_key}
            time.sleep(2)  # Google exige 2s entre páginas

        resp = requests.get(url, params=params, timeout=15)
        data = resp.json()

        if data.get("status") not in ("OK", "ZERO_RESULTS"):
            print(f"[Google] Erro: {data.get('status')} — {data.get('error_message','')}")
            break

        lugares.extend(data.get("results", []))
        token_pg = data.get("next_page_token")
        pagina += 1

        if not token_pg:
            break

    return lugares[:max_resultados]


# ─── DETALHES DO PLACE (telefone + website) ───────────────────────────────────
def detalhes_place(place_id, api_key):
    """Busca telefone e website de um place_id."""
    url    = "https://maps.googleapis.com/maps/api/place/details/json"
    campos = "formatted_phone_number,website,international_phone_number"
    resp   = requests.get(url, params={"place_id": place_id, "fields": campos, "key": api_key, "language": "pt-BR"}, timeout=10)
    result = resp.json().get("result", {})
    return {
        "telefone": result.get("formatted_phone_number") or result.get("international_phone_number"),
        "website":  result.get("website"),
    }


# ─── FORMATAR LEAD ────────────────────────────────────────────────────────────
def formatar_lead(place, nicho, cidade, estado, buscar_detalhes, api_key):
    place_id = place.get("place_id", "")
    nome     = place.get("name", "")
    rating   = place.get("rating")
    reviews  = place.get("user_ratings_total", 0)

    # Endereço
    addr      = place.get("formatted_address", "")
    componentes = place.get("address_components", [])
    bairro    = next((c["long_name"] for c in componentes if "sublocality" in c["types"]), None)
    municipio = next((c["long_name"] for c in componentes if "administrative_area_level_2" in c["types"]), cidade)

    # URL Maps
    maps_url = f"https://www.google.com/maps/place/?q=place_id:{place_id}" if place_id else None

    # Detalhes extras (telefone/website) — 1 req adicional por place
    telefone = None
    website  = None
    if buscar_detalhes and place_id:
        det      = detalhes_place(place_id, api_key)
        telefone = det["telefone"]
        website  = det["website"]
        time.sleep(0.1)  # respeitar rate limit

    # Categoria do Google Maps
    tipos     = place.get("types", [])
    categoria = tipos[0].replace("_", " ").title() if tipos else None

    return {
        "nome":          nome,
        "telefone":      telefone,
        "website":       website,
        "estado":        estado.upper()[:2],
        "cidade":        cidade,
        "municipio":     municipio,
        "bairro":        bairro,
        "nicho":         nicho,
        "categoria":     categoria,
        "googleMapsUrl": maps_url,
        "place_id":      place_id,
        "rating":        rating,
        "reviewsCount":  reviews,
        "fonte":         "google_maps",
        "status":        "novo",
        "priority":      "normal",
        "origem":        f"Google Maps — {addr}",
    }


# ─── ENVIAR PARA O CRM ────────────────────────────────────────────────────────
def enviar_crm(token, leads):
    """Envia lote de leads para o CRM (máx 500 por vez)."""
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Slug": CRM_SLUG,
        "Content-Type":  "application/json",
    }
    total_inseridos = 0
    total_ignorados = 0
    total_erros     = []

    # Divide em lotes de 200
    for i in range(0, len(leads), 200):
        lote = leads[i:i+200]
        r    = requests.post(f"{CRM_BASE}/leads/importar", json={"leads": lote}, headers=headers, timeout=30)
        if r.status_code == 200:
            d = r.json()
            total_inseridos += d.get("inseridos", 0)
            total_ignorados += d.get("ignorados", 0)
            total_erros     += d.get("erros", [])
            print(f"  Lote {i//200+1}: +{d.get('inseridos',0)} inseridos, {d.get('ignorados',0)} duplicatas")
        else:
            print(f"  [ERRO] Lote {i//200+1}: {r.status_code} — {r.text[:200]}")

    return total_inseridos, total_ignorados, total_erros


# ─── MAIN ────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Google Maps → CRM Divulga BR")
    parser.add_argument("--nicho",    default="Restaurante",   help="Nicho a buscar")
    parser.add_argument("--cidade",   default="São Paulo",     help="Cidade")
    parser.add_argument("--estado",   default="SP",            help="UF (ex: SP)")
    parser.add_argument("--max",      type=int, default=60,    help="Máx de resultados (máx 60 por busca)")
    parser.add_argument("--detalhes", action="store_true",     help="Buscar telefone/website (mais lento)")
    args = parser.parse_args()

    if GOOGLE_API_KEY == "SUA_GOOGLE_PLACES_API_KEY":
        print("[ERRO] Configure GOOGLE_API_KEY no script antes de rodar.")
        sys.exit(1)
    if CRM_EMAIL == "admin@suaempresa.com":
        print("[ERRO] Configure CRM_EMAIL e CRM_SENHA no script antes de rodar.")
        sys.exit(1)

    query = f"{args.nicho} em {args.cidade} {args.estado} Brasil"
    print(f"\n{'='*55}")
    print(f"  Busca: {query}")
    print(f"  Máx:   {args.max} resultados")
    print(f"  Detalhes extras: {'Sim (telefone/website)' if args.detalhes else 'Não'}")
    print(f"{'='*55}\n")

    # 1. Login no CRM
    token = login_crm()

    # 2. Busca no Google
    print(f"[Google] Buscando: {query}")
    places = buscar_places(query, GOOGLE_API_KEY, args.max)
    print(f"[Google] {len(places)} estabelecimentos encontrados.\n")

    if not places:
        print("Nenhum resultado. Verifique a query e a API key.")
        return

    # 3. Formata leads
    print("[Formatando] Convertendo para formato CRM...")
    leads = []
    for i, p in enumerate(places):
        lead = formatar_lead(p, args.nicho, args.cidade, args.estado, args.detalhes, GOOGLE_API_KEY)
        leads.append(lead)
        if args.detalhes:
            print(f"  {i+1}/{len(places)} — {lead['nome']}")

    # 4. Envia para o CRM
    print(f"\n[CRM] Enviando {len(leads)} leads...")
    inseridos, ignorados, erros = enviar_crm(token, leads)

    # 5. Resumo
    print(f"\n{'='*55}")
    print(f"  RESULTADO FINAL")
    print(f"  Inseridos:  {inseridos}")
    print(f"  Ignorados (já existiam): {ignorados}")
    print(f"  Erros:      {len(erros)}")
    if erros:
        print("\n  Detalhes dos erros:")
        for e in erros[:10]:
            print(f"    - {e.get('item')}: {e.get('erro')}")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    main()
