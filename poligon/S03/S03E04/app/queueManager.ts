/**
 * Klasa zarządzająca kolejkami osób i miast
 */
export class QueueManager {
    private personQueue: Set<string>;
    private cityQueue: Set<string>;

    constructor() {
        this.personQueue = new Set<string>();
        this.cityQueue = new Set<string>();
    }

    /**
     * Inicjalizuje kolejki znormalizowanymi danymi
     * @param names - Znormalizowane imiona
     * @param cities - Znormalizowane miasta
     */
    public initializeQueues(names: string[], cities: string[]): void {
        this.personQueue = new Set(names);
        this.cityQueue = new Set(cities);
    }

    /**
     * Czyści obie kolejki
     */
    public clearQueues(): void {
        this.personQueue.clear();
        this.cityQueue.clear();
    }

    /**
     * Dodaje osobę do kolejki
     * @param person - Osoba do dodania
     */
    public addPerson(person: string): void {
        this.personQueue.add(person);
    }

    /**
     * Dodaje miasto do kolejki
     * @param city - Miasto do dodania
     */
    public addCity(city: string): void {
        this.cityQueue.add(city);
    }

    /**
     * Sprawdza czy są jakieś elementy w kolejkach
     * @returns true jeśli są elementy w którejkolwiek kolejce
     */
    public hasItems(): boolean {
        return this.personQueue.size > 0 || this.cityQueue.size > 0;
    }

    /**
     * Zwraca listę osób w kolejce
     * @returns Lista osób
     */
    public getPersons(): string[] {
        return Array.from(this.personQueue);
    }

    /**
     * Zwraca listę miast w kolejce
     * @returns Lista miast
     */
    public getCities(): string[] {
        return Array.from(this.cityQueue);
    }

    /**
     * Czyści sprawdzone elementy z kolejek
     * @param checkedPersons - Zbiór sprawdzonych osób
     * @param checkedCities - Zbiór sprawdzonych miast
     */
    public clearCheckedItems(checkedPersons: Set<string>, checkedCities: Set<string>): void {
        checkedPersons.forEach(person => this.personQueue.delete(person));
        checkedCities.forEach(city => this.cityQueue.delete(city));
    }
} 